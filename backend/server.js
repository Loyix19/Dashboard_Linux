const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const si = require('systeminformation');
const { exec } = require('child_process');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});


console.log("INICIANDO MONITOR DE SISTEMA LINUX... ");


io.on('connection', (socket) => {
    console.log(`[Socket] Nuevo cliente conectado: ${socket.id}`);

    const interval = setInterval(async () => {
        try {
            const temp = await si.cpuTemperature();
            let temperaturaReal = temp.main;
            if (!temperaturaReal || temperaturaReal === 0) {
                temperaturaReal = "S/D"; 
            }

            const cpu = await si.currentLoad();
            const mem = await si.mem();
            const os = await si.osInfo();
            
            // Capturamos los procesos del sistema
            const listaProcesos = await si.processes();
            
            // Ordenamos por uso de CPU de mayor a menor y tomamos los primeros 5
            const topProcesos = listaProcesos.list
                .sort((a, b) => b.cpu - a.cpu)
                .slice(0, 5)
                .map(p => ({
                    pid: p.pid,
                    name: p.name,
                    cpu: p.cpu.toFixed(1),
                    mem: p.mem.toFixed(1),
                    state: p.state
                }));

            socket.emit('datos-consola', {
                cpuLoad: cpu.currentLoad.toFixed(2),
                ramUsed: (100 - (mem.available / mem.total * 100)).toFixed(2),
                ramFree: (mem.available / 1024 / 1024 / 1024).toFixed(2),
                temp: temperaturaReal,
                distro: os.distro,
                uptime: si.time().uptime,
                procesos: topProcesos // Enviamos la tabla de procesos filtrada
            });

        } catch (error) {
            console.error("[Error] Error al leer los sensores del sistema:", error);
        }
    }, 2000);

    socket.on('ejecutar-limpieza', () => {
        console.log(`[Comando] Petición de optimización de RAM recibida desde ID: ${socket.id}`);

        const comando = process.platform === "win32" 
            ? "echo 'Entorno de desarrollo Windows: Cache simulada purgada.'" 
            : "sync && echo 3 | sudo tee /proc/sys/vm/drop_caches";

        exec(comando, (error, stdout, stderr) => {
            if (error) {
                console.error(`[Error Bash]: ${error.message}`);
                socket.emit('resultado-comando', { success: false, msg: "Fallo al ejecutar comando en el Kernel." });
                return;
            }
            
            socket.emit('resultado-comando', { 
                success: true, 
                msg: process.platform === "win32" ? stdout.trim() : "Exito! Memoria cache de Linux liberada." 
            });
        });
    });

    //Acciones para acciones de consola avanzadas
    socket.on('ejecutar-comando', (accion) =>{
    	console.log(`[CLI] Accion solicitada: ${accion} por ID: ${socket.id}`);
	let comando = "";

	if (accion === "ping") {
	    comando = process.platform === "win32" ? "ping -n 2 8.8.8.8" : "ping -c 2 8.8.8.8";
	}else if (accion === "disco") {
	    comando = process.platform === "win32" ? "wmic logicaldisk get size,freespace,caption" : "df -h /";
	}
	exec(comando, (error,stdout,stderr) => {
	    if (error) {
	    	socket.emit('resultado-consola-avanzada',{
		    output: `Error al ejecutar comando: \n${stderr || error.message}`
		});
		return;
	    }
	    //Envio de la salida stdout al frontend
	    socket.emit('resultado-consola-avanzada', {output: stdout});
	});
    });


    socket.on('disconnect', () => {
        console.log(`[Socket] Cliente desconectado: ${socket.id}`);
        clearInterval(interval);
    });
});

const PORT = 4000;
server.listen(PORT, () => {
    console.log(`Servidor backend escuchando en: http://localhost:${PORT}`);
});
