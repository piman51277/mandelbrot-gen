let cluster = require('cluster')
const os = require('os')
const cpuCount = os.cpus().length
const fs = require('fs')
let size = 200;
const wsize = Math.floor(size * 1.25)
if (cluster.isMaster) {

    if (!fs.existsSync(`./images/${size}x${wsize}`)) {
        fs.mkdirSync(`./images/${size}x${wsize}`);
    }
    if (!fs.existsSync(`./images/${size}x${wsize}/data`)) {
        fs.mkdirSync(`./images/${size}x${wsize}/data`);
    }

    fs.writeFileSync(__dirname + `/images/${size}x${wsize}/index.json`, JSON.stringify({
        'size': size
    }));

    for (let i = 0; i < cpuCount; i++) {
        cluster.fork();
    }

    let nextLine = 0;
    cluster.on('online', (worker) => {
        if (nextLine > Math.ceil(size/2)) {
            worker.kill();
        } else {
            worker.send(JSON.stringify({
                'line': nextLine
            }))
            console.log(`Processing (${nextLine}/${Math.ceil(size/2)})`)
            nextLine++
        }

        worker.on('exit', (msg) => {
            if (nextLine <= Math.ceil(size/2)) {
                cluster.fork();
            }
        });
    });

} else {
    //mandelbrot worker
    const MAX_ITERATION = 80

    function mandelbrot(c) {
        let z = {
                x: 0,
                y: 0
            },
            n = 0,
            p, d;
        do {
            p = {
                x: Math.pow(z.x, 2) - Math.pow(z.y, 2),
                y: 2 * z.x * z.y
            }
            z = {
                x: p.x + c.x,
                y: p.y + c.y
            }
            d = Math.sqrt(Math.pow(z.x, 2) + Math.pow(z.y, 2))
            n += 1
        } while (d <= 2 && n < MAX_ITERATION)
        return [n, d <= 2]
    }
    process.on('message', (msg) => {
        msg = JSON.parse(msg)
        const x = msg.line
        let data = ''
        for (let i = 0; i < wsize; i++) {
            complex = {
                x: -2 + (i / size) * 2,
                y: -1 + (x / size) * 2
            }
            let mdb = mandelbrot(complex)
            data += (mdb[1] ? 0 : (mdb[0] % 15) + 1).toString(16)
        }
        fs.writeFileSync(__dirname + `/images/${size}x${wsize}/data/${x}.txt`, data, 'hex')
        process.exit()
    })
}