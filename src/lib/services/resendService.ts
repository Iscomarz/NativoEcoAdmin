import { Resend } from 'resend';
import { RESEND_API_KEY } from '$env/static/private';

// CONFIGURACIÓN DE REMITENTE (Cambiar aquí cuando tengas dominio propio verificado en Resend)
const DEFAULT_FROM = 'Nativo Eco Tours <reservas@takeovermx.com>';

// Solo instanciamos si la API Key está configurada para evitar errores en compilación
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

/**
 * Envía un correo de aviso de nueva experiencia con un diseño premium que sigue
 * la línea visual de Nativo Eco Tours y muestra las fotos de la experiencia.
 */
export async function enviarCorreoAvisoExperiencia(
    destinatarios: string[],
    nombreUbicacion: string,
    tituloExperiencia: string,
    fechaInicio: string,
    imagenes: string[] = []
): Promise<{ success: boolean; messageId?: string; error?: any }> {
    if (!resend) {
        console.warn('⚠️ Resend no está inicializado. Verifica que RESEND_API_KEY esté configurada en tus variables de entorno.');
        return { success: false, error: 'Resend no inicializado' };
    }

    if (!destinatarios || destinatarios.length === 0) {
        console.log('📝 No hay destinatarios para enviar el correo.');
        return { success: true };
    }

    try {
        // Formatear la fecha evitando desfasamientos por zona horaria (UTC)
        const dateParts = fechaInicio.split('T')[0].split('-');
        const dateObj = new Date(Date.UTC(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2])));
        const fechaFormateada = dateObj.toLocaleDateString('es-MX', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'UTC'
        });

        // Calcular días restantes de forma independiente de la hora local
        const hoy = new Date();
        const currentDate = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()));
        const diffTime = dateObj.getTime() - currentDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        let diasBadge = '';
        if (diffDays > 0) {
            diasBadge = `<div style="color: #10b981; font-size: 15px; font-weight: bold; margin-top: 6px; margin-bottom: 16px; font-family: 'Outfit', 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; text-align: left;">¡Faltan solo ${diffDays} días para partir!</div>`;
        }

        // Construir HTML para las imágenes (galería de 2 fotos o 1 sola)
        let imagesHtml = '';
        if (imagenes && imagenes.length > 0) {
            const img1 = imagenes[0];
            const img2 = imagenes[1];
            
            if (img1 && img2) {
                imagesHtml = `
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 24px;">
                        <tr>
                            <td width="48%" align="left">
                                <img src="${img1}" width="100%" style="max-width: 240px; height: 160px; object-fit: cover; border-radius: 12px; border: 1px solid #262626; display: block;" />
                            </td>
                            <td width="4%"></td>
                            <td width="48%" align="right">
                                <img src="${img2}" width="100%" style="max-width: 240px; height: 160px; object-fit: cover; border-radius: 12px; border: 1px solid #262626; display: block;" />
                            </td>
                        </tr>
                    </table>
                `;
            } else if (img1) {
                imagesHtml = `
                    <div style="margin-top: 24px; text-align: center;">
                        <img src="${img1}" width="100%" style="max-width: 500px; height: 260px; object-fit: cover; border-radius: 12px; border: 1px solid #262626; display: inline-block;" />
                    </div>
                `;
            }
        }

        // HTML premium estilizado según la línea de diseño de Nativo Eco Tours
        const htmlContent = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>¡Nueva Aventura Disponible!</title>
                <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
            </head>
            <body style="font-family: 'Outfit', 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #000000; color: #ffffff; margin: 0; padding: 0; -webkit-font-smoothing: antialiased;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #000000; min-height: 100%; padding: 40px 10px;">
                    <tr>
                        <td align="center">
                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px;">
                                <!-- LOGO -->
                                <tr>
                                    <td align="center" style="padding-bottom: 28px;">
                                        <div style="font-family: 'Outfit', sans-serif; font-size: 26px; font-weight: 800; letter-spacing: 8px; color: #ffffff; display: inline-block;">
                                            N A T I V 🖐
                                        </div>
                                    </td>
                                </tr>
                                
                                <!-- HEADER TITULO -->
                                <tr>
                                    <td align="center" style="padding-bottom: 24px;">
                                        <h1 style="font-family: 'Outfit', sans-serif; font-size: 28px; font-weight: 800; margin: 0; color: #ffffff; letter-spacing: 1.5px; text-transform: uppercase; text-align: center; line-height: 1.3;">
                                            ¡NUEVA AVENTURA DISPONIBLE!
                                        </h1>
                                    </td>
                                </tr>

                                <!-- MENSAJE BIENVENIDA -->
                                <tr>
                                    <td align="center" style="padding-bottom: 32px; font-family: 'Inter', sans-serif; font-size: 16px; line-height: 1.6; color: #d6d3d1; text-align: center;">
                                        Hola, te avisamos que acabamos de activar una nueva experiencia en tu ubicación favorita.<br />¡Estamos muy emocionados de presentarte este nuevo viaje!
                                    </td>
                                </tr>

                                <!-- CARD DETALLES -->
                                <tr>
                                    <td style="background-color: #141414; border-radius: 16px; padding: 32px; border: 1px solid #262626; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.5);">
                                        <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                            <tr>
                                                <td style="font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 2px; color: #78716c; text-transform: uppercase; padding-bottom: 20px;">
                                                    Detalles de la Aventura
                                                </td>
                                            </tr>
                                            
                                            <!-- EXPERIENCIA -->
                                            <tr>
                                                <td style="padding-bottom: 18px;">
                                                    <div style="font-family: 'Inter', sans-serif; font-size: 13px; color: #78716c; margin-bottom: 4px;">Experiencia:</div>
                                                    <div style="font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 700; color: #ffffff;">${tituloExperiencia}</div>
                                                </td>
                                            </tr>

                                            <!-- FECHA DE SALIDA -->
                                            <tr>
                                                <td style="padding-bottom: 18px;">
                                                    <div style="font-family: 'Inter', sans-serif; font-size: 13px; color: #78716c; margin-bottom: 4px;">Fecha de Salida:</div>
                                                    <div style="font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 700; color: #ffffff;">${fechaFormateada}</div>
                                                    ${diasBadge}
                                                </td>
                                            </tr>

                                            <!-- UBICACION -->
                                            <tr>
                                                <td style="padding-bottom: 8px;">
                                                    <div style="font-family: 'Inter', sans-serif; font-size: 13px; color: #78716c; margin-bottom: 4px;">Ubicación:</div>
                                                    <div style="font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 700; color: #ffffff;">${nombreUbicacion}</div>
                                                </td>
                                            </tr>

                                            <!-- GALERIA IMAGENES -->
                                            ${imagesHtml ? `<tr><td>${imagesHtml}</td></tr>` : ''}
                                        </table>
                                    </td>
                                </tr>

                                <!-- LLAMADO A LA ACCION -->
                                <tr>
                                    <td align="center" style="padding-top: 36px; padding-bottom: 24px; font-family: 'Inter', sans-serif; font-size: 14px; line-height: 1.5; color: #a8a29e; text-align: center;">
                                        Únete a esta aventura reservando tu lugar antes de que se agoten los cupos:
                                    </td>
                                </tr>

                                <!-- BOTON VER DETALLES -->
                                <tr>
                                    <td align="center" style="padding-bottom: 48px;">
                                        <table cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td align="center" bgcolor="#1ebd60" style="border-radius: 9999px;">
                                                    <a href="https://nativotours.com" target="_blank" style="display: inline-block; background-color: #1ebd60; color: #ffffff !important; text-decoration: none; font-weight: 700; padding: 16px 36px; border-radius: 9999px; font-size: 15px; letter-spacing: 1px; text-transform: uppercase; font-family: 'Outfit', sans-serif; border: 1px solid #1ebd60;">
                                                        Ver detalles de la aventura
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <!-- FOOTER SEPARATOR -->
                                <tr>
                                    <td>
                                        <hr style="border: 0; border-top: 1px solid #222222; margin: 0; margin-bottom: 24px;" />
                                    </td>
                                </tr>

                                <!-- FOOTER TEXTO -->
                                <tr>
                                    <td align="center" style="font-family: 'Outfit', sans-serif; font-size: 11px; letter-spacing: 2px; color: #44403c; text-transform: uppercase; text-align: center; padding-bottom: 20px;">
                                        Nativo Eco Tours - Siente la Naturaleza
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `;

        console.log(`✉️ Enviando correo de aviso de aventura a ${destinatarios.length} destinatario(s)...`);

        const { data, error } = await resend.emails.send({
            from: DEFAULT_FROM,
            to: [DEFAULT_FROM], // Enviarnos el correo a nosotros mismos como destinatario principal
            bcc: destinatarios, // Enviar en copia oculta a los clientes para cuidar su privacidad
            subject: `🌲 ¡Nueva Aventura Activa: ${tituloExperiencia}! 🌲`,
            html: htmlContent
        });

        if (error) {
            console.error('❌ Error enviando correo con Resend:', error);
            return { success: false, error };
        }

        console.log('✅ Correo de aviso enviado con éxito. ID:', data?.id);
        return { success: true, messageId: data?.id };
    } catch (error) {
        console.error('❌ Excepción al enviar correo con Resend:', error);
        return { success: false, error };
    }
}
