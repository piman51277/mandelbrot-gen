let cluster = require('cluster')
const os = require('os')
const cpuCount = os.cpus().length
let size = 100000;
const wsize = Math.floor(size * 1.25)
if (cluster.isMaster) {
    const {
        createCanvas
    } = require('canvas')
    const canvas = createCanvas(wsize, size)
    let ctx = canvas.getContext('2d')
    let fs = require('fs');

    const colors = new Array(16).fill(0).map((_, i) => `#00${((i*16).toString(16)).padEnd(4,0)}`)


    //divides up pixels for processing
    //Maybe do line-by-line, top to bottom?
    for (let i = 0; i < cpuCount; i++) {
        cluster.fork();
    }

    let nextLine = 0;
    let finishCount = 0;
    cluster.on('online', (worker) => {
        worker.send(JSON.stringify({
            'line': nextLine
        }))
        console.log(`Processing (${nextLine}/${size})`)

        nextLine++

        worker.on('message', function (msg) {
            msg = JSON.parse(msg)
            for (let i = 0; i < msg.data.length; i++) {
                ctx.fillStyle = colors[msg.data[i][1] ? 0 : (msg.data[i][0] % colors.length - 1) + 1]
                ctx.fillRect(i,msg.line, 1, 1)

            }
            if (nextLine <= size) {
                worker.kill();
                cluster.fork();
            } else {
                const out = fs.createWriteStream(__dirname + `/mandelbrot${size}x${wsize}.png`)
                const stream = canvas.createPNGStream()
                stream.pipe(out)
                out.on('finish', () => {
                    //this section will run the # of CPU cores, so wait until this is executed 8 times.
                    finishCount++;
                    if (finishCount == cpuCount) {
                        console.log('finished!')
                        process.exit();
                    }
                })
            }
        });
    });

} else {
    //mandelbrot worker
    const MAX_ITERATION = 200

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
        const res = {
            'line': msg.line,
            'data': []
        }
        for (let i = 0; i < wsize; i++) {
            complex = {
                x: -2 + (i / size) * 2,
                y: -1 + (x / size) * 2
            }
            res.data.push(mandelbrot(complex))
        }
        process.send(JSON.stringify(res))
    })




}