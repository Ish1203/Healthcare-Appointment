const { google } = require('googleapis');

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

function getAuthUrl(userId, role) {
  const oAuth2Client = getOAuthClient();
  return oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    state: JSON.stringify({ userId, role }),
  });
}

async function createCalendarEvent(tokens, summary, description, dateStr, timeStr, durationMins = 30) {
  if (!tokens) return null;
  try {
    const oAuth2Client = getOAuthClient();
    oAuth2Client.setCredentials(JSON.parse(tokens));
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

    const [year, month, day] = dateStr.split('-').map(Number);
    const [hour, minute] = timeStr.split(':').map(Number);
    const start = new Date(year, month - 1, day, hour, minute);
    const end = new Date(start.getTime() + durationMins * 60000);

    const event = await calendar.events.insert({
      calendarId: 'primary',
      resource: {
        summary,
        description,
        start: { dateTime: start.toISOString(), timeZone: 'Asia/Kolkata' },
        end: { dateTime: end.toISOString(), timeZone: 'Asia/Kolkata' },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 60 },
            { method: 'popup', minutes: 15 },
          ],
        },
      },
    });
    return event.data.id;
  } catch (err) {
    console.error('Calendar create error:', err.message);
    return null;
  }
}

async function deleteCalendarEvent(tokens, eventId) {
  if (!tokens || !eventId) return;
  try {
    const oAuth2Client = getOAuthClient();
    oAuth2Client.setCredentials(JSON.parse(tokens));
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    await calendar.events.delete({ calendarId: 'primary', eventId });
  } catch (err) {
    console.error('Calendar delete error:', err.message);
  }
}

async function updateCalendarEvent(tokens, eventId, summary, description, dateStr, timeStr, durationMins = 30) {
  if (!tokens || !eventId) return null;
  try {
    const oAuth2Client = getOAuthClient();
    oAuth2Client.setCredentials(JSON.parse(tokens));
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

    const [year, month, day] = dateStr.split('-').map(Number);
    const [hour, minute] = timeStr.split(':').map(Number);
    const start = new Date(year, month - 1, day, hour, minute);
    const end = new Date(start.getTime() + durationMins * 60000);

    const event = await calendar.events.update({
      calendarId: 'primary',
      eventId,
      resource: {
        summary,
        description,
        start: { dateTime: start.toISOString(), timeZone: 'Asia/Kolkata' },
        end: { dateTime: end.toISOString(), timeZone: 'Asia/Kolkata' },
      },
    });
    return event.data.id;
  } catch (err) {
    console.error('Calendar update error:', err.message);
    return null;
  }
}

module.exports = { getAuthUrl, getOAuthClient, createCalendarEvent, deleteCalendarEvent, updateCalendarEvent };
