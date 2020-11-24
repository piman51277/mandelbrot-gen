let fs = require('fs');
let dir = "/images/200x250"
let cluster = require('cluster')
const os = require('os')
const cpuCount = os.cpus().length
const colors = new Array(16).fill(0).map((_, i) => `#00${((i*16).toString(16)).padEnd(4,0)}`)

if (cluster.isMaster) {
    //fetches the resultion from dir
    let res = require(__dirname + dir + "/index.json").size

    if (!fs.existsSync(__dirname + dir + `/img`)) {
        fs.mkdirSync(__dirname + dir + `/img`);
    }
    let nextLine = 0;
    for (let i = 0; i < cpuCount; i++) {
        cluster.fork();
    }

    cluster.on('online', (worker) => {
        if (nextLine > Math.ceil(res / 2)) {
            worker.kill();
        } else {
            worker.send(JSON.stringify({
                'line': nextLine,
                'dir': __dirname + dir + `/data/${nextLine}.txt`,
                'tdir': __dirname + dir + `/img/${nextLine}.png`,
                'res':res
            }))
            console.log(`Processing (${nextLine}/${Math.ceil(res/2)})`)
            nextLine++
        }

        worker.on('exit', (msg) => {
            if (nextLine <= Math.ceil(res / 2)) {
                cluster.fork();
            }
        });
    });
} else {
    const {
        createCanvas
    } = require('canvas')


    process.on('message', (msg) => {
        msg = JSON.parse(msg)
        const canvas = createCanvas(msg.res, 1)
        let ctx = canvas.getContext('2d')
        let data = fs.readFileSync(msg.dir, 'hex').toString();
        for (i in data) {
            ctx.fillStyle = colors[parseInt(data[i], 16)]
            ctx.fillRect(i, 0, 1, 1)
        }
        const out = fs.createWriteStream(msg.tdir)
        const stream = canvas.createPNGStream()
        stream.pipe(out)
        out.on('finish',()=>{process.exit();})
    })


}