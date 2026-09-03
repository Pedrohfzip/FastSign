import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config();
const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendSignatureInvite({ to, signatoryName, documentTitle, signLink }) {
    try {
        const { data, error } = await resend.emails.send({
            from: process.env.EMAIL_FROM || 'Sinaki <onboarding@resend.dev>',
            to,
            subject: `Você foi convidado a assinar: ${documentTitle}`,
            html: `
                <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
                    <h2 style="color: #111;">Olá, ${signatoryName}!</h2>
                    <p style="color: #444; line-height: 1.5;">
                        Você foi convidado a assinar o documento <strong>${documentTitle}</strong> através do Sinaki.
                    </p>
                    <a href="${signLink}"
                       style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #5b6af0; color: #fff; text-decoration: none; border-radius: 10px; font-weight: 600;">
                        Assinar documento
                    </a>
                    <p style="color: #888; font-size: 13px; margin-top: 24px;">
                        Se você não reconhece essa solicitação, pode ignorar este e-mail.
                    </p>
                </div>
            `,
        });
        console.log('[EmailService.sendSignatureInvite] Resend response:', { data, error, to });

        if (error) {
            console.error('[EmailService.sendSignatureInvite] Resend error:', error);
            // não lançamos erro — falha de e-mail não deve quebrar o fluxo de criação de signatários
            return { success: false, error };
        }

        return { success: true, data };
    } catch (err) {
        console.error('[EmailService.sendSignatureInvite]', err);
        return { success: false, error: err };
    }
}