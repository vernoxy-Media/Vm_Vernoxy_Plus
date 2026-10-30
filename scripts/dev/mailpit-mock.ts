import * as net from 'net';
import * as http from 'http';

interface StoredMessage {
  ID: string;
  From: { Name: string; Address: string };
  To: Array<{ Name: string; Address: string }>;
  Subject: string;
  Created: string;
  Snippet: string;
  Text: string;
  HTML: string;
}

const messages: StoredMessage[] = [];

// 1. SMTP Server on port 1025
const smtpServer = net.createServer((socket) => {
  let state: 'GREETING' | 'COMMAND' | 'DATA' = 'COMMAND';
  let buffer = '';
  let currentFrom = '';
  let currentTo: string[] = [];
  let dataLines: string[] = [];

  socket.write('220 mailpit.local ESMTP MailpitMock\r\n');

  socket.on('error', (err) => {
    // Ignore connection resets – don't crash the server
    if ((err as any).code !== 'ECONNRESET') {
      console.error('[MailpitMock] Socket error:', err.message);
    }
  });

  socket.on('data', (chunk) => {
    buffer += chunk.toString('utf8');

    while (buffer.includes('\r\n')) {
      const idx = buffer.indexOf('\r\n');
      const line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);

      if (state === 'DATA') {
        if (line === '.') {
          state = 'COMMAND';
          // Parse raw email data
          const fullData = dataLines.join('\r\n');
          const [headersPart, ...bodyParts] = fullData.split('\r\n\r\n');
          const body = bodyParts.join('\r\n\r\n');

          let subject = '';
          for (const h of headersPart.split('\r\n')) {
            if (h.toLowerCase().startsWith('subject:')) {
              subject = h.slice(8).trim();
            }
          }

          // Find 6 digit code in body
          const match = body.match(/\b\d{6}\b/);
          const snippet = match ? `Your verification code is ${match[0]}` : body.slice(0, 100);

          const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          const msg: StoredMessage = {
            ID: id,
            From: { Name: 'Vernoxy Pulse', Address: currentFrom },
            To: currentTo.map((addr) => ({ Name: '', Address: addr })),
            Subject: subject,
            Created: new Date().toISOString(),
            Snippet: snippet,
            Text: body,
            HTML: body,
          };
          messages.unshift(msg);
          console.log(`\n📧 [MailpitMock] >>> NEW EMAIL to ${msg.To.map((t) => t.Address).join(', ')} | Subject: ${subject} | ${snippet} <<<\n`);

          dataLines = [];
          currentFrom = '';
          currentTo = [];

          socket.write('250 2.0.0 Ok: queued\r\n');
        } else {
          dataLines.push(line);
        }
      } else {
        const cmd = line.trim().toUpperCase();
        if (cmd.startsWith('EHLO') || cmd.startsWith('HELO')) {
          socket.write('250-mailpit.local\r\n250 8BITMIME\r\n');
        } else if (cmd.startsWith('MAIL FROM:')) {
          currentFrom = line.slice(10).replace(/[<>]/g, '').trim();
          socket.write('250 2.1.0 Ok\r\n');
        } else if (cmd.startsWith('RCPT TO:')) {
          currentTo.push(line.slice(8).replace(/[<>]/g, '').trim());
          socket.write('250 2.1.5 Ok\r\n');
        } else if (cmd === 'DATA') {
          state = 'DATA';
          dataLines = [];
          socket.write('354 End data with <CR><LF>.<CR><LF>\r\n');
        } else if (cmd === 'RSET') {
          currentFrom = '';
          currentTo = [];
          dataLines = [];
          socket.write('250 2.0.0 Ok\r\n');
        } else if (cmd === 'QUIT') {
          socket.write('221 2.0.0 Bye\r\n');
          socket.end();
        } else if (cmd === 'NOOP') {
          socket.write('250 2.0.0 Ok\r\n');
        } else {
          socket.write('250 2.0.0 Ok\r\n');
        }
      }
    }
  });
});

smtpServer.listen(1025, '0.0.0.0', () => {
  console.log('[MailpitMock] SMTP listening on port 1025');
});

// 2. HTTP Server on port 8025
const httpServer = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = req.url || '';

  if (url === '/api/v1/messages' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        total: messages.length,
        unread: messages.length,
        count: messages.length,
        messages,
      }),
    );
    return;
  }

  if (url === '/api/v1/messages' && req.method === 'DELETE') {
    messages.length = 0;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (url.startsWith('/api/v1/message/') && req.method === 'GET') {
    const id = url.slice('/api/v1/message/'.length);
    const msg = messages.find((m) => m.ID === id);
    if (msg) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(msg));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

httpServer.listen(8025, '0.0.0.0', () => {
  console.log('[MailpitMock] REST API listening on port 8025');
});
