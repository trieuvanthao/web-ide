import { spawn } from 'node:child_process';

const procs = [
  ['[server]', 'npm', ['run', 'dev', '-w', 'server']],
  ['[client]', 'npm', ['run', 'dev', '-w', 'client']],
];

for (const [label, cmd, args] of procs) {
  const p = spawn(cmd, args, { shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const pipe = (stream, isError) => {
    let buf = '';
    stream.setEncoding('utf8');
    stream.on('data', (d) => {
      buf += d;
      let idx;
      while ((idx = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, idx);
        buf = buf.slice(idx + 1);
        (isError ? console.error : console.log)(`${label} ${line}`);
      }
    });
  };
  pipe(p.stdout, false);
  pipe(p.stderr, true);
  p.on('exit', (code) => console.log(`${label} exited with code ${code}`));
}

process.on('SIGINT', () => process.exit(0));
