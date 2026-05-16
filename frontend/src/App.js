import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:4000');

function App() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  // Estado para guardar el texto que nos devuelva la terminal
  const [terminalOutput, setTerminalOutput] = useState("Esperando comandos...\n");

  useEffect(() => {
    socket.on('datos-consola', (data) => {
      setMetrics(data);
    });

    socket.on('resultado-comando', (respuesta) => {
      setLoading(false);
      alert(`[Respuesta del Servidor]\n${respuesta.msg}`);
    });

    // Escuchador para la salida de texto de la consola avanzada
    socket.on('resultado-consola-avanzada', (respuesta) => {
      setLoading(false);
      setTerminalOutput(respuesta.output);
    });

    return () => {
      socket.off('datos-consola');
      socket.off('resultado-comando');
      socket.off('resultado-consola-avanzada');
    };
  }, []);

  const mandarComandoLimpieza = () => {
    setLoading(true);
    socket.emit('ejecutar-limpieza');
  };

  // Función para invocar las nuevas acciones de red y almacenamiento
  const mandarAccionConsola = (accion) => {
    setLoading(true);
    setTerminalOutput(`Ejecutando comando en el servidor...\n`);
    socket.emit('ejecutar-comando', accion);
  };

  if (!metrics) {
    return (
      <div style={{
        backgroundColor: '#0a0a0a', minHeight: '100vh', display: 'flex', 
        justifyContent: 'center', alignItems: 'center', color: '#00ff00', 
        fontFamily: 'monospace', fontSize: '1.2rem'
      }}>
        Conectando al socket del servidor Linux...
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}> <span style={styles.dot}>.</span> LINUX_SYSTEM_DASHBOARD_</h1>
        <p style={styles.subtitle}>OS Distro: {metrics.distro} | Uptime: {Math.floor(metrics.uptime / 3600)} horas</p>
      </header>
      
      {/* SECCIÓN ACTUALIZADA: CENTRO DE COMANDO */}
      <section style={styles.actionSection}>
        <div style={styles.buttonGroup}>
          <button 
            onClick={mandarComandoLimpieza} 
            disabled={loading} 
            style={{...styles.button, borderColor: '#00ff00', color: loading ? '#666' : '#00ff00'}}
          >
            RUN: drop_caches (RAM)
          </button>
          
          <button 
            onClick={() => mandarAccionConsola('ping')} 
            disabled={loading} 
            style={{...styles.button, borderColor: '#ffff00', color: loading ? '#666' : '#ffff00'}}
          >
            RUN: ping -c 2 (Network)
          </button>

          <button 
            onClick={() => mandarAccionConsola('disco')} 
            disabled={loading} 
            style={{...styles.button, borderColor: '#ff00ff', color: loading ? '#666' : '#ff00ff'}}
          >
            RUN: df -h (Storage)
          </button>
        </div>

        {/* PANTALLA DE SALIDA DE TERMINAL */}
        <div style={styles.terminalBox}>
          <div style={styles.terminalHeader}>TERMINAL OUTPUT</div>
          <pre style={styles.terminalContent}>{terminalOutput}</pre>
        </div>
      </section>

      <main style={styles.grid}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>CPU USAGE</h3>
          <div style={styles.barContainer}>
            <div style={{...styles.bar, width: `${metrics.cpuLoad}%`, backgroundColor: '#00ff00'}}></div>
          </div>
          <p style={styles.value}>{metrics.cpuLoad}%</p>
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>RAM USAGE</h3>
          <div style={styles.barContainer}>
            <div style={{...styles.bar, width: `${metrics.ramUsed}%`, backgroundColor: '#00d4ff'}}></div>
          </div>
          <p style={styles.value}>{metrics.ramUsed}% ({metrics.ramFree} GB Free)</p>
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>SYSTEM TEMP</h3>
          <p style={{
              ...styles.value, 
              fontSize: '3rem', 
              color: metrics.temp === "S/D" ? '#555' : (metrics.temp > 60 ? 'red' : 'orange')
          }}>
            {metrics.temp === "S/D" ? 'NO SENSOR' : `${metrics.temp} C`}
          </p>
          {metrics.temp === "S/D" && <small style={{color: '#666'}}>Virtual Environment detected</small>}
        </div>
      </main>

      <section style={styles.processSection}>
        <h3 style={styles.processTitle}>TOP PROCESSES (ORDERED BY CPU)</h3>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>PID</th>
              <th style={styles.thLeft}>COMMAND</th>
              <th style={styles.th}>%CPU</th>
              <th style={styles.th}>%MEM</th>
              <th style={styles.th}>STATE</th>
            </tr>
          </thead>
          <tbody>
            {metrics.procesos && metrics.procesos.map((proc) => (
              <tr key={proc.pid} style={styles.tr}>
                <td style={styles.td}>{proc.pid}</td>
                <td style={styles.tdLeft}>{proc.name}</td>
                <td style={{...styles.td, color: '#00ff00'}}>{proc.cpu}%</td>
                <td style={{...styles.td, color: '#00d4ff'}}>{proc.mem}%</td>
                <td style={styles.td}>{proc.state}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

const styles = {
  container: { backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#e0e0e0', fontFamily: "'Courier New', Courier, monospace", padding: '40px' },
  header: { marginBottom: '20px' },
  title: { borderBottom: '1px solid #333', paddingBottom: '10px', letterSpacing: '2px', fontSize: '1.8rem' },
  dot: { color: '#00ff00' },
  subtitle: { color: '#888', marginTop: '5px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' },
  card: { background: '#161616', padding: '20px', borderRadius: '5px', border: '1px solid #333', textAlign: 'center' },
  cardTitle: { fontSize: '1rem', color: '#888', letterSpacing: '1px' },
  barContainer: { background: '#222', height: '12px', borderRadius: '6px', overflow: 'hidden', margin: '20px 0' },
  bar: { height: '100%', transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' },
  value: { fontWeight: 'bold', fontSize: '1.4rem', color: '#fff', margin: 0 },
  processSection: { marginTop: '40px', background: '#161616', padding: '25px', borderRadius: '5px', border: '1px solid #333' },
  processTitle: { fontSize: '1.1rem', color: '#fff', letterSpacing: '1px', marginBottom: '20px', borderBottom: '1px solid #222', paddingBottom: '10px' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '10px', color: '#888', borderBottom: '1px solid #333', fontSize: '0.9rem', textAlign: 'center' },
  thLeft: { padding: '10px', color: '#888', borderBottom: '1px solid #333', fontSize: '0.9rem', textAlign: 'left' },
  tr: { borderBottom: '1px solid #222' },
  td: { padding: '12px 10px', fontSize: '0.95rem', textAlign: 'center' },
  tdLeft: { padding: '12px 10px', fontSize: '0.95rem', textAlign: 'left', color: '#fff' },

  // Nuevos estilos para la sección de consola avanzada
  actionSection: { marginBottom: '40px', background: '#111', padding: '20px', borderRadius: '5px', border: '1px solid #222' },
  buttonGroup: { display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' },
  button: { padding: '10px 20px', fontFamily: "'Courier New', Courier, monospace", fontWeight: 'bold', border: '1px solid', borderRadius: '4px', backgroundColor: 'transparent', cursor: 'pointer', transition: '0.2s' },
  terminalBox: { background: '#050505', border: '1px solid #333', borderRadius: '4px', overflow: 'hidden' },
  terminalHeader: { background: '#222', color: '#aaa', padding: '6px 12px', fontSize: '0.8rem', letterSpacing: '1px' },
  terminalContent: { padding: '15px', margin: 0, color: '#aaa', fontSize: '0.9rem', whiteSpace: 'pre-wrap', overflowX: 'auto', minHeight: '80px' }
};

export default App;
