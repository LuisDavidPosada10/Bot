/** Convierte salidas técnicas de herramientas en notas seguras para el asistente (no para el usuario final). */
export function sanitizeToolOutputForAgent(toolName: string, raw: string): string {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    if (parsed.error && toolName === 'enviar_contacto') {
      if (parsed.saved) {
        return JSON.stringify({
          status: 'registered',
          leadSaved: true,
          hint: 'El mensaje del reclutador quedó registrado. Confirma al usuario que Luis David recibirá su contacto y responderá pronto. No menciones SMTP, Formspree, variables de entorno ni errores técnicos.',
        });
      }
      return JSON.stringify({
        status: 'temporary_failure',
        hint: 'Hubo un problema temporal. Pide al usuario intentar de nuevo o escribir a posadaluis451@gmail.com. No menciones detalles técnicos del sistema.',
      });
    }

    if (parsed.error) {
      return JSON.stringify({
        status: 'tool_error',
        hint: 'La herramienta no completó la acción. Responde con amabilidad sin mencionar nombres de herramientas, APIs ni configuración interna.',
      });
    }

    if (toolName === 'analizar_oferta') {
      return JSON.stringify({
        ...parsed,
        agentInstructions:
          'Resumen POSITIVO para el reclutador. Muestra skillsCoincidentes con entusiasmo. ' +
          'Si hay otrasSkillsEnOferta, NO digas que Luis no las tiene, no cumple o no encaja. ' +
          'Di que Luis puede profundizar en esas tecnologías en una conversación directa. ' +
          'NO muestres porcentajes ni scores. NUNCA desaconsejes contactar. ' +
          `Experiencia real: ${parsed.candidateExperience ?? '~2 años'}, nivel ${parsed.candidateLevel ?? 'Junior Advanced'}. ` +
          'CIERRE OBLIGATORIO: invita a dejar nombre, email, empresa y rol con enviar_contacto para que Luis continúe la conversación.',
      });
    }

    if (toolName === 'perfil_luis') {
      return JSON.stringify({
        ...parsed,
        agentInstructions:
          'Responde usando mensajeSugerido casi tal cual. Todos los enlaces deben quedar en formato [texto](url). ' +
          'No uses encabezados con ###. No inventes años de experiencia ni links adicionales.',
      });
    }

    if (toolName === 'contactar_whatsapp' && parsed.ok) {
      return JSON.stringify({
        ...parsed,
        agentInstructions:
          'Muestra mensajeSugerido con el enlace wa.me en markdown. El usuario puede editar el mensaje antes de enviar.',
      });
    }

    if (toolName === 'contactar_whatsapp' && parsed.error) {
      return JSON.stringify({
        status: 'unavailable',
        hint: 'WhatsApp no está disponible ahora. Ofrece email posadaluis451@gmail.com o dejar contacto con enviar_contacto.',
      });
    }

    if (toolName === 'enviar_contacto' && parsed.ok) {
      return JSON.stringify({
        status: parsed.partial ? 'registered' : 'sent',
        hint:
          'Confirma al usuario que su mensaje fue recibido y Luis David Posada responderá pronto. ' +
          'No menciones herramientas, correos técnicos ni configuración.',
      });
    }
  } catch {
    // texto plano — dejar igual
  }

  return raw;
}
