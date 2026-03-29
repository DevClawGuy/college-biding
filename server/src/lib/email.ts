import { Resend } from 'resend';

let resend: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const client = getResend();
  if (!client) {
    console.warn('sendEmail: RESEND_API_KEY not set, skipping email to', to);
    return false;
  }

  try {
    const { error } = await client.emails.send({
      from: 'HouseRush <onboarding@resend.dev>',
      to,
      subject,
      html,
    });

    if (error) {
      console.error('sendEmail failed:', error);
      return false;
    }

    console.log(`sendEmail: sent to ${to} — "${subject}"`);
    return true;
  } catch (err) {
    console.error('sendEmail error:', err);
    return false;
  }
}

export async function sendVerificationEmail(to: string, token: string): Promise<boolean> {
  const verifyUrl = `https://houserush.vercel.app/verify-email?token=${token}`;
  const html = `
    <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <span style="font-size: 48px;">&#127891;</span>
        <h1 style="font-size: 24px; font-weight: 700; color: #0f172a; margin: 16px 0 8px;">Verify Your Student Email</h1>
        <p style="color: #64748b; font-size: 16px; margin: 0;">Click the button below to verify your .edu email and unlock your verified badge on HouseRush.</p>
      </div>
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${verifyUrl}" style="display: inline-block; background: #4f46e5; color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 15px;">Verify Email</a>
      </div>
      <p style="color: #94a3b8; font-size: 13px; text-align: center;">This link expires in 24 hours. If you didn't create a HouseRush account, you can ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0 16px;" />
      <p style="color: #94a3b8; font-size: 12px; text-align: center;">HouseRush — The fastest way to find off-campus housing.</p>
    </div>
  `;
  return sendEmail(to, 'Verify your student email for HouseRush', html);
}

export function winnerEmailHtml(opts: { address: string; amount: number; listingId: string }): string {
  return `
    <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <span style="font-size: 48px;">&#127881;</span>
        <h1 style="font-size: 24px; font-weight: 700; color: #0f172a; margin: 16px 0 8px;">You Won the Auction!</h1>
        <p style="color: #64748b; font-size: 16px; margin: 0;">Congratulations on securing your new home.</p>
      </div>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Property</p>
        <p style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #0f172a;">${opts.address}</p>
        <p style="margin: 0 0 8px; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Winning Bid</p>
        <p style="margin: 0; font-size: 28px; font-weight: 700; color: #4f46e5;">$${opts.amount.toLocaleString()}/mo</p>
      </div>
      <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
        Your agent will be in touch shortly to finalize the lease. In the meantime, you can view the listing details below.
      </p>
      <div style="text-align: center;">
        <a href="https://houserush.vercel.app/listing/${opts.listingId}" style="display: inline-block; background: #4f46e5; color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 15px;">View Listing</a>
      </div>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0 16px;" />
      <p style="color: #94a3b8; font-size: 12px; text-align: center;">HouseRush — The fastest way to find off-campus housing.</p>
    </div>
  `;
}

export function landlordEmailHtml(opts: { address: string; amount: number; winnerName: string; winnerEmail: string; listingId: string }): string {
  return `
    <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px;">
      <h1 style="font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 8px;">Auction Closed</h1>
      <p style="color: #64748b; font-size: 15px; margin: 0 0 24px;">A winner has been determined for your property listing.</p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Property</p>
        <p style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #0f172a;">${opts.address}</p>
        <p style="margin: 0 0 8px; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Winning Bid</p>
        <p style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #4f46e5;">$${opts.amount.toLocaleString()}/mo</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
        <p style="margin: 0 0 8px; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Winner</p>
        <p style="margin: 0 0 4px; font-size: 16px; font-weight: 600; color: #0f172a;">${opts.winnerName}</p>
        <p style="margin: 0; font-size: 15px; color: #4f46e5;">
          <a href="mailto:${opts.winnerEmail}" style="color: #4f46e5; text-decoration: none;">${opts.winnerEmail}</a>
        </p>
      </div>
      <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
        Please reach out to the winner to finalize the lease agreement. You can contact them directly via the email above.
      </p>
      <div style="text-align: center;">
        <a href="https://houserush.vercel.app/listing/${opts.listingId}" style="display: inline-block; background: #0f172a; color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 15px;">View Listing</a>
      </div>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0 16px;" />
      <p style="color: #94a3b8; font-size: 12px; text-align: center;">HouseRush — The fastest way to find off-campus housing.</p>
    </div>
  `;
}
