import 'dotenv/config';
import { enviarContactoTool } from '../src/tools/email.js';

const result = await enviarContactoTool.invoke({
  recruiterName: 'Test Recruiter',
  recruiterEmail: 'recruiter.test@example.com',
  company: 'Acme Corp',
  role: 'Frontend Developer',
  message: 'Prueba de contacto desde script',
  matchScore: 85,
  sessionId: 'test-script',
});

console.log(result);
