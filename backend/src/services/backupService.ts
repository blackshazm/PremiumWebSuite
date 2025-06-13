import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import cron from 'node-cron';
import { AuditService, AuditEventType } from './auditService';
import { encrypt } from '../utils/encryption';

const execAsync = promisify(exec);

export class BackupService {
  private static backupDir = process.env.BACKUP_DIR || './backups';
  private static maxBackups = parseInt(process.env.MAX_BACKUPS || '30');
  private static isInitialized = false;

  /**
   * Inicializa o serviço de backup
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Criar diretório de backup se não existir
      await fs.mkdir(this.backupDir, { recursive: true });

      // Agendar backups automáticos
      this.scheduleBackups();

      this.isInitialized = true;
      console.log('✅ Serviço de backup inicializado');
    } catch (error) {
      console.error('❌ Erro ao inicializar serviço de backup:', error);
    }
  }

  /**
   * Agenda backups automáticos
   */
  private static scheduleBackups(): void {
    // Backup diário às 2:00 AM
    cron.schedule('0 2 * * *', async () => {
      console.log('🔄 Iniciando backup automático diário...');
      await this.createFullBackup();
    });

    // Backup incremental a cada 6 horas
    cron.schedule('0 */6 * * *', async () => {
      console.log('🔄 Iniciando backup incremental...');
      await this.createIncrementalBackup();
    });

    // Limpeza de backups antigos semanalmente
    cron.schedule('0 3 * * 0', async () => {
      console.log('🧹 Limpando backups antigos...');
      await this.cleanOldBackups();
    });

    console.log('⏰ Backups automáticos agendados');
  }

  /**
   * Cria backup completo do banco de dados
   */
  static async createFullBackup(): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `backup-full-${timestamp}.sql`;
      const filepath = path.join(this.backupDir, filename);

      // Comando pg_dump para PostgreSQL
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        throw new Error('DATABASE_URL não configurada');
      }

      const command = `pg_dump "${dbUrl}" > "${filepath}"`;
      await execAsync(command);

      // Criptografar backup
      const encryptedFilepath = await this.encryptBackup(filepath);

      // Remover arquivo não criptografado
      await fs.unlink(filepath);

      // Registrar no log de auditoria
      await AuditService.logEvent({
        eventType: AuditEventType.BACKUP_CREATED,
        metadata: {
          type: 'full',
          filename: path.basename(encryptedFilepath),
          size: (await fs.stat(encryptedFilepath)).size,
          timestamp: new Date().toISOString(),
        },
      });

      console.log(`✅ Backup completo criado: ${encryptedFilepath}`);
      return encryptedFilepath;
    } catch (error) {
      console.error('❌ Erro ao criar backup completo:', error);
      throw error;
    }
  }

  /**
   * Cria backup incremental (apenas dados modificados)
   */
  static async createIncrementalBackup(): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `backup-incremental-${timestamp}.sql`;
      const filepath = path.join(this.backupDir, filename);

      // Data do último backup
      const lastBackupDate = await this.getLastBackupDate();
      const whereClause = lastBackupDate 
        ? `WHERE updated_at > '${lastBackupDate.toISOString()}'`
        : '';

      // Tabelas para backup incremental
      const tables = [
        'users',
        'subscriptions',
        'orders',
        'commissions',
        'withdrawal_requests',
        'audit_logs',
      ];

      let backupContent = '';

      for (const table of tables) {
        const dbUrl = process.env.DATABASE_URL;
        const command = `pg_dump "${dbUrl}" --table=${table} --data-only ${whereClause ? `--where="${whereClause}"` : ''}`;
        
        try {
          const { stdout } = await execAsync(command);
          backupContent += `-- Table: ${table}\n${stdout}\n\n`;
        } catch (error) {
          console.warn(`⚠️ Erro ao fazer backup da tabela ${table}:`, error);
        }
      }

      // Salvar conteúdo do backup
      await fs.writeFile(filepath, backupContent);

      // Criptografar backup
      const encryptedFilepath = await this.encryptBackup(filepath);

      // Remover arquivo não criptografado
      await fs.unlink(filepath);

      // Registrar no log de auditoria
      await AuditService.logEvent({
        eventType: AuditEventType.BACKUP_CREATED,
        metadata: {
          type: 'incremental',
          filename: path.basename(encryptedFilepath),
          size: (await fs.stat(encryptedFilepath)).size,
          lastBackupDate: lastBackupDate?.toISOString(),
          timestamp: new Date().toISOString(),
        },
      });

      console.log(`✅ Backup incremental criado: ${encryptedFilepath}`);
      return encryptedFilepath;
    } catch (error) {
      console.error('❌ Erro ao criar backup incremental:', error);
      throw error;
    }
  }

  /**
   * Criptografa arquivo de backup
   */
  private static async encryptBackup(filepath: string): Promise<string> {
    try {
      const content = await fs.readFile(filepath, 'utf8');
      const encrypted = encrypt(content);
      
      const encryptedFilepath = `${filepath}.enc`;
      await fs.writeFile(encryptedFilepath, JSON.stringify(encrypted));
      
      return encryptedFilepath;
    } catch (error) {
      console.error('❌ Erro ao criptografar backup:', error);
      throw error;
    }
  }

  /**
   * Obtém a data do último backup
   */
  private static async getLastBackupDate(): Promise<Date | null> {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files
        .filter(file => file.startsWith('backup-') && file.endsWith('.enc'))
        .sort()
        .reverse();

      if (backupFiles.length === 0) return null;

      const lastBackupFile = backupFiles[0];
      const stats = await fs.stat(path.join(this.backupDir, lastBackupFile));
      return stats.mtime;
    } catch (error) {
      console.error('❌ Erro ao obter data do último backup:', error);
      return null;
    }
  }

  /**
   * Remove backups antigos
   */
  static async cleanOldBackups(): Promise<void> {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files
        .filter(file => file.startsWith('backup-') && file.endsWith('.enc'))
        .map(file => ({
          name: file,
          path: path.join(this.backupDir, file),
        }));

      // Ordenar por data de modificação (mais recente primeiro)
      const filesWithStats = await Promise.all(
        backupFiles.map(async file => ({
          ...file,
          stats: await fs.stat(file.path),
        }))
      );

      filesWithStats.sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

      // Manter apenas os backups mais recentes
      const filesToDelete = filesWithStats.slice(this.maxBackups);

      for (const file of filesToDelete) {
        await fs.unlink(file.path);
        console.log(`🗑️ Backup antigo removido: ${file.name}`);
      }

      if (filesToDelete.length > 0) {
        console.log(`✅ ${filesToDelete.length} backups antigos removidos`);
      }
    } catch (error) {
      console.error('❌ Erro ao limpar backups antigos:', error);
    }
  }

  /**
   * Lista todos os backups disponíveis
   */
  static async listBackups(): Promise<Array<{
    filename: string;
    type: 'full' | 'incremental';
    size: number;
    createdAt: Date;
  }>> {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(file => 
        file.startsWith('backup-') && file.endsWith('.enc')
      );

      const backups = await Promise.all(
        backupFiles.map(async filename => {
          const filepath = path.join(this.backupDir, filename);
          const stats = await fs.stat(filepath);
          
          return {
            filename,
            type: filename.includes('full') ? 'full' as const : 'incremental' as const,
            size: stats.size,
            createdAt: stats.birthtime,
          };
        })
      );

      return backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('❌ Erro ao listar backups:', error);
      return [];
    }
  }

  /**
   * Restaura backup (CUIDADO: operação destrutiva)
   */
  static async restoreBackup(filename: string, adminId: string): Promise<void> {
    try {
      const filepath = path.join(this.backupDir, filename);
      
      // Verificar se arquivo existe
      await fs.access(filepath);

      // Descriptografar backup
      const encryptedContent = await fs.readFile(filepath, 'utf8');
      const encrypted = JSON.parse(encryptedContent);
      const { decrypt } = await import('../utils/encryption');
      const backupContent = decrypt(encrypted);

      // Criar backup de segurança antes da restauração
      const safetyBackup = await this.createFullBackup();
      console.log(`🛡️ Backup de segurança criado: ${safetyBackup}`);

      // Restaurar backup
      const tempFilepath = path.join(this.backupDir, `temp-restore-${Date.now()}.sql`);
      await fs.writeFile(tempFilepath, backupContent);

      const dbUrl = process.env.DATABASE_URL;
      const command = `psql "${dbUrl}" < "${tempFilepath}"`;
      await execAsync(command);

      // Remover arquivo temporário
      await fs.unlink(tempFilepath);

      // Registrar no log de auditoria
      await AuditService.logEvent({
        adminId,
        eventType: AuditEventType.BACKUP_RESTORED,
        metadata: {
          restoredBackup: filename,
          safetyBackup: path.basename(safetyBackup),
          timestamp: new Date().toISOString(),
        },
      });

      console.log(`✅ Backup restaurado com sucesso: ${filename}`);
    } catch (error) {
      console.error('❌ Erro ao restaurar backup:', error);
      throw error;
    }
  }

  /**
   * Verifica integridade dos backups
   */
  static async verifyBackupIntegrity(): Promise<{
    total: number;
    valid: number;
    invalid: string[];
  }> {
    try {
      const backups = await this.listBackups();
      const results = {
        total: backups.length,
        valid: 0,
        invalid: [] as string[],
      };

      for (const backup of backups) {
        try {
          const filepath = path.join(this.backupDir, backup.filename);
          const encryptedContent = await fs.readFile(filepath, 'utf8');
          const encrypted = JSON.parse(encryptedContent);
          
          // Tentar descriptografar para verificar integridade
          const { decrypt } = await import('../utils/encryption');
          decrypt(encrypted);
          
          results.valid++;
        } catch (error) {
          results.invalid.push(backup.filename);
        }
      }

      return results;
    } catch (error) {
      console.error('❌ Erro ao verificar integridade dos backups:', error);
      throw error;
    }
  }

  /**
   * Exporta dados específicos do usuário (LGPD)
   */
  static async exportUserData(userId: string): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `user-data-export-${userId}-${timestamp}.json`;
      const filepath = path.join(this.backupDir, filename);

      // Buscar todos os dados do usuário
      const userData = await this.getUserData(userId);

      // Salvar dados exportados
      await fs.writeFile(filepath, JSON.stringify(userData, null, 2));

      // Criptografar arquivo
      const encryptedFilepath = await this.encryptBackup(filepath);
      await fs.unlink(filepath);

      console.log(`✅ Dados do usuário exportados: ${encryptedFilepath}`);
      return encryptedFilepath;
    } catch (error) {
      console.error('❌ Erro ao exportar dados do usuário:', error);
      throw error;
    }
  }

  /**
   * Busca todos os dados de um usuário
   */
  private static async getUserData(userId: string): Promise<any> {
    const { prisma } = await import('../index');

    const [
      user,
      address,
      bankData,
      subscription,
      orders,
      commissions,
      withdrawals,
      auditLogs,
    ] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.address.findUnique({ where: { userId } }),
      prisma.bankData.findUnique({ where: { userId } }),
      prisma.subscription.findUnique({ where: { userId } }),
      prisma.order.findMany({ where: { userId } }),
      prisma.commission.findMany({ where: { earnerId: userId } }),
      prisma.withdrawalRequest.findMany({ where: { userId } }),
      prisma.auditLog.findMany({ where: { userId } }),
    ]);

    return {
      user,
      address,
      bankData,
      subscription,
      orders,
      commissions,
      withdrawals,
      auditLogs,
      exportedAt: new Date().toISOString(),
    };
  }
}
