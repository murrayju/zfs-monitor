const express = require('express');
const cp = require('child_process');

const app = express();

function spawn(
  command,
  args,
  options,
  pipeOutput = false,
  captureOutput = false,
) {
  const p = cp.spawn(command, args, {
    ...options,
    ...(pipeOutput && !captureOutput && !(options && options.stdio)
      ? { stdio: 'inherit' }
      : {}),
  });
  return {
    process: p,
    promise: new Promise((resolve, reject) => {
      let output = '';
      if (captureOutput) {
        if (p.stdout) {
          if (pipeOutput) {
            p.stdout.pipe(process.stdout);
          }
          p.stdout.on('data', d => {
            output += d.toString();
          });
        }
        if (p.stderr) {
          if (pipeOutput) {
            p.stderr.pipe(process.stderr);
          }
          p.stderr.on('data', d => {
            output += d.toString();
          });
        }
      }

      p.on('close', code => {
        if (code === 0) {
          resolve(output);
        } else {
          const err = new Error(
            `${command} ${args.join(' ')} => ${code} (error) <${output}>`,
          );
          // $FlowFixMe
          err.capturedOutput = output;
          reject(err);
        }
      });
    }),
  };
}

app.get('/', async (req, res) => {
  const status = await (spawn('zpool', ['status'], null, false, true).promise);
  res.set('Content-Type', 'text/plain');
  res.send(status);
});

app.listen(80);
