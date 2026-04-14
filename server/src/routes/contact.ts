import { Router, Request, Response } from 'express';
import { sendEmail } from '../lib/email';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      res.status(400).json({ error: 'Name, email, and message are required' });
      return;
    }

    console.log(`[Contact Form] From: ${name} <${email}>`);
    console.log(`[Contact Form] Message: ${message}`);

    const contactEmail = process.env.CONTACT_EMAIL || 'contact@houserush.app';
    const html = `
      <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px;">
        <h1 style="font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 24px;">New Contact Form Submission</h1>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">From</p>
          <p style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #0f172a;">${name} &lt;${email}&gt;</p>
          <p style="margin: 0 0 8px; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Message</p>
          <p style="margin: 0; font-size: 15px; color: #334155; line-height: 1.6; white-space: pre-wrap;">${message}</p>
        </div>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0 16px;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">HouseRush Contact Form</p>
      </div>
    `;

    const sent = await sendEmail(contactEmail, 'New HouseRush Contact Form Submission', html);

    if (!sent) {
      res.status(500).json({ success: false, error: 'Failed to send message. Please email us directly at contact@houserush.app' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
