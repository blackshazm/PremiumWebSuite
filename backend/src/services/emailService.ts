import nodemailer from 'nodemailer';
import { formatCurrency, formatDateBR } from '../utils/helpers';

// Interface para dados do email
interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Interface para dados do usuário
interface UserData {
  firstName: string;
  lastName: string;
  email: string;
}

// Configurar transporter do nodemailer
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true para 465, false para outras portas
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Função base para enviar email
export const sendEmail = async (emailData: EmailData): Promise<void> => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email enviado para: ${emailData.to}`);
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    throw new Error('Falha ao enviar email');
  }
};

// Template base para emails
const getEmailTemplate = (content: string, title: string = 'BioClub+'): string => {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .container {
          background-color: white;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #4CAF50;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          color: #4CAF50;
          margin-bottom: 10px;
        }
        .content {
          margin-bottom: 30px;
        }
        .button {
          display: inline-block;
          padding: 12px 30px;
          background-color: #4CAF50;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          font-size: 12px;
          color: #666;
        }
        .highlight {
          background-color: #f0f8f0;
          padding: 15px;
          border-left: 4px solid #4CAF50;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">BioClub+</div>
          <p>Sua jornada para uma vida mais saudável</p>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <p>Este é um email automático, não responda.</p>
          <p>© 2024 BioClub+. Todos os direitos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Email de boas-vindas
export const sendWelcomeEmail = async (user: UserData, verificationToken: string): Promise<void> => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
  
  const content = `
    <h2>Bem-vindo ao BioClub+, ${user.firstName}!</h2>
    <p>Estamos muito felizes em tê-lo conosco na nossa comunidade de bem-estar e produtos naturais.</p>
    
    <div class="highlight">
      <h3>Para começar, você precisa verificar seu email:</h3>
      <a href="${verificationUrl}" class="button">Verificar Email</a>
    </div>
    
    <p>Após a verificação, você poderá:</p>
    <ul>
      <li>Gerenciar sua assinatura</li>
      <li>Explorar nossa loja de produtos naturais</li>
      <li>Indicar amigos e ganhar comissões</li>
      <li>Acompanhar seus ganhos e saques</li>
    </ul>
    
    <p>Se você não se cadastrou no BioClub+, pode ignorar este email.</p>
  `;

  await sendEmail({
    to: user.email,
    subject: 'Bem-vindo ao BioClub+ - Verifique seu email',
    html: getEmailTemplate(content, 'Bem-vindo ao BioClub+'),
  });
};

// Email de verificação de email
export const sendEmailVerification = async (user: UserData, verificationToken: string): Promise<void> => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
  
  const content = `
    <h2>Verificação de Email</h2>
    <p>Olá, ${user.firstName}!</p>
    <p>Para ativar sua conta no BioClub+, clique no botão abaixo:</p>
    
    <div class="highlight">
      <a href="${verificationUrl}" class="button">Verificar Email</a>
    </div>
    
    <p>Este link é válido por 24 horas.</p>
    <p>Se você não solicitou esta verificação, pode ignorar este email.</p>
  `;

  await sendEmail({
    to: user.email,
    subject: 'BioClub+ - Verificação de Email',
    html: getEmailTemplate(content),
  });
};

// Email de recuperação de senha
export const sendPasswordResetEmail = async (user: UserData, resetToken: string): Promise<void> => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  
  const content = `
    <h2>Recuperação de Senha</h2>
    <p>Olá, ${user.firstName}!</p>
    <p>Recebemos uma solicitação para redefinir sua senha no BioClub+.</p>
    
    <div class="highlight">
      <a href="${resetUrl}" class="button">Redefinir Senha</a>
    </div>
    
    <p>Este link é válido por 1 hora.</p>
    <p>Se você não solicitou a redefinição de senha, pode ignorar este email.</p>
  `;

  await sendEmail({
    to: user.email,
    subject: 'BioClub+ - Recuperação de Senha',
    html: getEmailTemplate(content),
  });
};

// Email de nova indicação
export const sendNewReferralEmail = async (user: UserData, referredUser: UserData): Promise<void> => {
  const content = `
    <h2>Nova Indicação! 🎉</h2>
    <p>Olá, ${user.firstName}!</p>
    <p>Temos uma ótima notícia! <strong>${referredUser.firstName}</strong> se cadastrou através do seu link de indicação.</p>
    
    <div class="highlight">
      <p>Assim que a assinatura for confirmada, você receberá sua comissão!</p>
    </div>
    
    <p>Continue compartilhando seu link e aumentando seus ganhos no BioClub+.</p>
  `;

  await sendEmail({
    to: user.email,
    subject: 'BioClub+ - Nova Indicação Recebida!',
    html: getEmailTemplate(content),
  });
};

// Email de comissão liberada
export const sendCommissionAvailableEmail = async (
  user: UserData, 
  amount: number, 
  referredUser: UserData
): Promise<void> => {
  const content = `
    <h2>Comissão Liberada! 💰</h2>
    <p>Olá, ${user.firstName}!</p>
    <p>Sua comissão de <strong>${formatCurrency(amount)}</strong> referente à indicação de <strong>${referredUser.firstName}</strong> foi liberada!</p>
    
    <div class="highlight">
      <p>O valor já está disponível para saque em sua conta.</p>
    </div>
    
    <p>Acesse sua conta para solicitar o saque ou continue indicando amigos para aumentar seus ganhos.</p>
  `;

  await sendEmail({
    to: user.email,
    subject: 'BioClub+ - Comissão Liberada!',
    html: getEmailTemplate(content),
  });
};

// Email de confirmação de saque
export const sendWithdrawalRequestEmail = async (user: UserData, amount: number): Promise<void> => {
  const content = `
    <h2>Solicitação de Saque Recebida</h2>
    <p>Olá, ${user.firstName}!</p>
    <p>Recebemos sua solicitação de saque no valor de <strong>${formatCurrency(amount)}</strong>.</p>
    
    <div class="highlight">
      <p>Sua solicitação será processada em até 3 dias úteis.</p>
    </div>
    
    <p>Você receberá uma confirmação quando o pagamento for processado.</p>
  `;

  await sendEmail({
    to: user.email,
    subject: 'BioClub+ - Solicitação de Saque Recebida',
    html: getEmailTemplate(content),
  });
};

// Email de confirmação de pagamento de saque
export const sendWithdrawalPaidEmail = async (user: UserData, amount: number): Promise<void> => {
  const content = `
    <h2>Saque Processado! ✅</h2>
    <p>Olá, ${user.firstName}!</p>
    <p>Seu saque no valor de <strong>${formatCurrency(amount)}</strong> foi processado com sucesso!</p>
    
    <div class="highlight">
      <p>O valor deve aparecer em sua conta em até 2 dias úteis.</p>
    </div>
    
    <p>Continue indicando amigos e aumentando seus ganhos no BioClub+!</p>
  `;

  await sendEmail({
    to: user.email,
    subject: 'BioClub+ - Saque Processado!',
    html: getEmailTemplate(content),
  });
};

// Email de lembrete de pagamento
export const sendPaymentReminderEmail = async (user: UserData, dueDate: Date, amount: number): Promise<void> => {
  const content = `
    <h2>Lembrete de Pagamento</h2>
    <p>Olá, ${user.firstName}!</p>
    <p>Sua assinatura do BioClub+ vence em <strong>${formatDateBR(dueDate)}</strong>.</p>
    
    <div class="highlight">
      <p>Valor: <strong>${formatCurrency(amount)}</strong></p>
      <p>Mantenha sua assinatura em dia para não perder os benefícios!</p>
    </div>
    
    <p>Se você já efetuou o pagamento, pode ignorar este email.</p>
  `;

  await sendEmail({
    to: user.email,
    subject: 'BioClub+ - Lembrete de Pagamento',
    html: getEmailTemplate(content),
  });
};

// Email de confirmação de pedido
export const sendOrderConfirmationEmail = async (
  user: UserData, 
  orderNumber: string, 
  total: number,
  items: Array<{ name: string; quantity: number; price: number }>
): Promise<void> => {
  const itemsList = items.map(item => 
    `<li>${item.name} - Qtd: ${item.quantity} - ${formatCurrency(item.price)}</li>`
  ).join('');

  const content = `
    <h2>Pedido Confirmado! 📦</h2>
    <p>Olá, ${user.firstName}!</p>
    <p>Seu pedido <strong>#${orderNumber}</strong> foi confirmado com sucesso!</p>
    
    <div class="highlight">
      <h3>Itens do pedido:</h3>
      <ul>${itemsList}</ul>
      <p><strong>Total: ${formatCurrency(total)}</strong></p>
    </div>
    
    <p>Você receberá o código de rastreamento assim que o pedido for enviado.</p>
  `;

  await sendEmail({
    to: user.email,
    subject: `BioClub+ - Pedido #${orderNumber} Confirmado`,
    html: getEmailTemplate(content),
  });
};
