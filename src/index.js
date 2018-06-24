const express = require('express');
const Router = require('express-promise-router');
const cp = require('child_process');

const { getDrives } = require('./drives');

const app = express();
const router = Router();

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

router.get('/', async (req, res) => {
  const status = (await spawn('zpool', ['status'], null, false, true).promise).trim();
  const driveInfo = `SMART Status:\n${(await Promise.all((await getDrives()).map(async d => {
    const smart = JSON.parse(await spawn('smartctl', ['-j', '-i', '-A', '-H', d.device], null, false, true).promise);
    return `${d.device}: overall health ${smart.smart_status.passed ? 'PASSED' : 'FAILED'}
    ${smart.model_family}
    model:  ${smart.model_name}
    serial: ${smart.serial_number}
    temp:   ${smart.temperature.current}℃`;
  }))).join('\n\n')}`;
  res.set('Content-Type', 'text/plain');
  res.send([status, driveInfo].join('\n\n\n'));
});

app.use(router);
app.listen(80);
