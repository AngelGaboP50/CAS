import React, { useState, useEffect } from 'react';
import './InteractiveMap.css';
import { useAulas } from '../hooks/useAulas';

export type EstadoAula = 'LIBRE' | 'EN_CLASE' | 'ALERTA' | 'EXCEPCION' | 'NO_DISPONIBLE';

export interface AulaDesc {
  id: string;
  label: string;
  estado: EstadoAula;
  x: number;
  y: number;
  w: number;
  h: number;
  onClick?: () => void;
}

const AULA_W = 120;
const AULA_H = 100;
const GAP_X = 20;
const GAP_Y = 20;
const PASILLO_H = 64;

const row1Y = 0;
const row2Y = AULA_H + GAP_Y; 
const row3Y = row2Y + PASILLO_H + GAP_Y;

const colX = (col: number) => col * (AULA_W + GAP_X);

const TOTAL_WIDTH = colX(6) + AULA_W; 
const TOTAL_HEIGHT = row3Y + AULA_H;
const CX = TOTAL_WIDTH / 2;
const CY = TOTAL_HEIGHT / 2;

const AULAS: AulaDesc[] = [
  // Fila Superior
  { id: '4', label: '4', estado: 'NO_DISPONIBLE', x: colX(0), y: row1Y, w: AULA_W, h: AULA_H },
  { id: '3', label: '3', estado: 'NO_DISPONIBLE', x: colX(1), y: row1Y, w: AULA_W, h: AULA_H },
  { id: '2', label: '2', estado: 'LIBRE',         x: colX(2), y: row1Y, w: AULA_W, h: AULA_H },
  { id: '1', label: '1', estado: 'EN_CLASE',      x: colX(3), y: row1Y, w: AULA_W, h: AULA_H },
  
  // Fila Inferior
  { id: '5', label: '5', estado: 'NO_DISPONIBLE', x: colX(0), y: row3Y, w: AULA_W, h: AULA_H },
  { id: '6', label: '6', estado: 'NO_DISPONIBLE', x: colX(1), y: row3Y, w: AULA_W, h: AULA_H },
  { id: '7', label: '7', estado: 'NO_DISPONIBLE', x: colX(2), y: row3Y, w: AULA_W, h: AULA_H },
  { id: '8', label: '8', estado: 'NO_DISPONIBLE', x: colX(3), y: row3Y, w: AULA_W, h: AULA_H },
  { id: '9', label: '9', estado: 'NO_DISPONIBLE', x: colX(4), y: row3Y, w: AULA_W, h: AULA_H },
];

export const InteractiveMap: React.FC = () => {
  const [rotation, setRotation] = useState<number>(0);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [viewBoxStr, setViewBoxStr] = useState<string>(`0 0 ${TOTAL_WIDTH} ${TOTAL_HEIGHT}`);

  const { aulas: aulasRemotas } = useAulas();

  // Combina las aulas estáticas con el estado remoto de Supabase
  const aulasDinamicas = AULAS.map(aulaEstatica => {
    const remota = aulasRemotas.find(a => a.id === aulaEstatica.id);
    if (remota) {
      return { ...aulaEstatica, estado: remota.estado, label: remota.label };
    }
    return aulaEstatica;
  });

  // Helpers para calcular variables del contenedor para absorber colisión de áreas (Bounding Box y Pitágoras)
  useEffect(() => {
    const PADDING = 20; // Padding to avoid border clipping during strokes
    if (isTransitioning) {
      // Uso de Pitágoras para la zona segura durante transición (Caja Segura)
      const maxDim = Math.sqrt(TOTAL_WIDTH ** 2 + TOTAL_HEIGHT ** 2);
      const minX = CX - maxDim / 2;
      const minY = CY - maxDim / 2;
      setViewBoxStr(`${minX - PADDING} ${minY - PADDING} ${maxDim + PADDING * 2} ${maxDim + PADDING * 2}`);
    } else {
      // Uso Funcionalidad con Bounding Box exacto al reposar usando sen/cos
      const rad = rotation * (Math.PI / 180);
      const absCos = Math.abs(Math.cos(rad));
      const absSin = Math.abs(Math.sin(rad));
      
      const newWidth = TOTAL_WIDTH * absCos + TOTAL_HEIGHT * absSin;
      const newHeight = TOTAL_WIDTH * absSin + TOTAL_HEIGHT * absCos;
      
      const minX = CX - newWidth / 2;
      const minY = CY - newHeight / 2;
      
      setViewBoxStr(`${minX - PADDING} ${minY - PADDING} ${newWidth + PADDING * 2} ${newHeight + PADDING * 2}`);
    }
  }, [rotation, isTransitioning]);

  const handleRotate = (angleChange: number) => {
    setIsTransitioning(true);
    let newRotation = (rotation + angleChange) % 360;
    if (newRotation < 0) newRotation += 360;
    
    setRotation(newRotation);
    setTimeout(() => {
      setIsTransitioning(false);
    }, 450); // Mismo tiempo que dura la transición CSS
  };

  const handleSetRotation = (exactAngle: number) => {
    setIsTransitioning(true);
    setRotation(exactAngle);
    setTimeout(() => {
      setIsTransitioning(false);
    }, 450); 
  };

  // Preservación de un sistema de contra-rotación sobre textos para que su orientación visual quede inalterada pese a la rotación
  const textRotateTransform = (rectX: number, rectY: number, rectW: number, rectH: number) => {
    const textCenterX = rectX + rectW / 2;
    const textCenterY = rectY + rectH / 2;
    return `rotate(${-rotation}, ${textCenterX}, ${textCenterY})`;
  };

  const renderAula = (aula: AulaDesc) => {
    const classMod = `svg-aula-rect--${aula.estado}`;
    const cx = aula.x + aula.w / 2;
    const cy = aula.y + aula.h / 2;
    
    return (
      <g 
        key={aula.id} 
        className={`svg-aula-node ${aula.estado !== 'NO_DISPONIBLE' ? 'clickable' : ''}`}
        tabIndex={0}
        role="button"
        aria-label={`Salón ${aula.label}, ${aula.estado}`}
      >
        <rect
          x={aula.x}
          y={aula.y}
          width={aula.w}
          height={aula.h}
          rx={8} // border-radius
          className={`svg-aula-rect ${classMod}`}
        />
        
        {/* Helper Group For Centered Text Setup */}
        <g transform={textRotateTransform(aula.x, aula.y, aula.w, aula.h)}>
            <text x={cx} y={cy - 8} className="svg-aula-label" textAnchor="middle" dominantBaseline="middle">
              {aula.label}
            </text>
            <text x={cx} y={cy + 18} className={`svg-aula-sublabel svg-text-state--${aula.estado}`} textAnchor="middle" dominantBaseline="middle">
              {aula.estado === 'NO_DISPONIBLE' ? 'No disponible' : 
               aula.estado === 'LIBRE' ? 'Libre' : 
               aula.estado === 'EN_CLASE' ? 'En clase' : 
               aula.estado === 'ALERTA' ? 'Alerta' : 'Excepción'}
            </text>
        </g>
      </g>
    );
  };

  return (
    <div className="map-container" style={{ margin: '0 0 40px 0', background: 'transparent', border: 'none', padding: 0 }}>
      <div className="map-header" style={{ marginBottom: '20px' }}>
        <h3 className="map-title" style={{ fontSize: '22px', fontWeight: 600 }}>Mapa del edificio</h3>
        <div className="map-header-right">
          <div className="map-controls">
            <button className={`map-btn ${rotation === 0 ? 'active' : ''}`} onClick={() => handleSetRotation(0)}>0°</button>
            <button className={`map-btn ${rotation === 90 ? 'active' : ''}`} onClick={() => handleSetRotation(90)}>90°</button>
            <button className={`map-btn ${rotation === 180 ? 'active' : ''}`} onClick={() => handleSetRotation(180)}>180°</button>
            <button className={`map-btn ${rotation === 270 ? 'active' : ''}`} onClick={() => handleSetRotation(270)}>270°</button>
            
            <button className="map-btn" onClick={() => handleRotate(90)} style={{ marginLeft: '12px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>rotate_right</span> Rotar
            </button>
          </div>
        </div>
      </div>

      <div className="svg-map-wrapper">
        <svg
          viewBox={viewBoxStr}
          preserveAspectRatio="xMidYMid meet"
          className="interactive-svg-elem"
        >
          {/* El grupo contenedor que maneja la transformación */}
          <g 
            className="svg-map-content-group"
            style={{ 
              transform: `rotate(${rotation}deg)`, 
              transformOrigin: `${CX}px ${CY}px` 
            }}
          >
            {/* --------- CAPA ESTÁTICA DEL MAPA --------- */}
            
            {/* Pasillo central */}
            <rect 
              x={0} y={row2Y} width={TOTAL_WIDTH} height={PASILLO_H} rx={4} 
              className="svg-static-pasillo-dashed" 
            />
            <text 
              x={TOTAL_WIDTH / 2} y={row2Y + PASILLO_H / 2} 
              className="svg-pasillo-text" textAnchor="middle" dominantBaseline="middle"
              transform={textRotateTransform(0, row2Y, TOTAL_WIDTH, PASILLO_H)}
            >
              PASILLO
            </text>

            {/* Oficinas y Escaleras - Superiores (Indices 4, 5, 6) */}
            <g>
                <rect x={colX(4)} y={row1Y} width={AULA_W} height={AULA_H} rx={8} className="svg-static-dashed" />
                <text x={colX(4) + AULA_W/2} y={row1Y + AULA_H/2} className="svg-static-text" textAnchor="middle" dominantBaseline="middle" transform={textRotateTransform(colX(4), row1Y, AULA_W, AULA_H)}>
                    Oficina
                </text>

                <rect x={colX(5)} y={row1Y} width={AULA_W} height={AULA_H} rx={8} className="svg-static-dashed" />
                <text x={colX(5) + AULA_W/2} y={row1Y + AULA_H/2} className="svg-static-text" textAnchor="middle" dominantBaseline="middle" transform={textRotateTransform(colX(5), row1Y, AULA_W, AULA_H)}>
                    Oficina
                </text>

                <rect x={colX(6)} y={row1Y} width={AULA_W} height={AULA_H} rx={8} className="svg-static-dashed" />
                <g transform={textRotateTransform(colX(6), row1Y, AULA_W, AULA_H)}>
                   {/* Lineas de Escalera */}
                   <line x1={colX(6)+25} y1={row1Y+20} x2={colX(6)+AULA_W-25} y2={row1Y+20} stroke="rgba(255,255,255,0.15)" strokeWidth={2} />
                   <line x1={colX(6)+25} y1={row1Y+35} x2={colX(6)+AULA_W-25} y2={row1Y+35} stroke="rgba(255,255,255,0.15)" strokeWidth={2} />
                   <line x1={colX(6)+25} y1={row1Y+50} x2={colX(6)+AULA_W-25} y2={row1Y+50} stroke="rgba(255,255,255,0.15)" strokeWidth={2} />
                   <line x1={colX(6)+25} y1={row1Y+65} x2={colX(6)+AULA_W-25} y2={row1Y+65} stroke="rgba(255,255,255,0.15)" strokeWidth={2} />
                   
                   {/* Flecha Doble */}
                   <path d={`M ${colX(6)+AULA_W/2} ${row1Y+12} L ${colX(6)+AULA_W/2} ${row1Y+72}`} stroke="rgba(255,255,255,0.3)" strokeWidth={1.5} />
                   <path d={`M ${colX(6)+AULA_W/2 - 4} ${row1Y+18} L ${colX(6)+AULA_W/2} ${row1Y+12} L ${colX(6)+AULA_W/2 + 4} ${row1Y+18}`} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1.5} />
                   <path d={`M ${colX(6)+AULA_W/2 - 4} ${row1Y+66} L ${colX(6)+AULA_W/2} ${row1Y+72} L ${colX(6)+AULA_W/2 + 4} ${row1Y+66}`} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1.5} />

                   <text x={colX(6) + AULA_W/2} y={row1Y + AULA_H - 12} className="svg-static-text" style={{ fontSize: '10px' }} textAnchor="middle" dominantBaseline="middle">
                       Escaleras
                   </text>
                </g>
            </g>

            {/* Oficina Amplia - Inferior (Indices 5 y 6, Span2) */}
            <g>
                <rect x={colX(5)} y={row3Y} width={AULA_W * 2 + GAP_X} height={AULA_H} rx={8} className="svg-static-dashed" />
                <text x={colX(5) + (AULA_W * 2 + GAP_X)/2} y={row3Y + AULA_H/2} className="svg-static-text" textAnchor="middle" dominantBaseline="middle" transform={textRotateTransform(colX(5), row3Y, AULA_W * 2 + GAP_X, AULA_H)}>
                    Oficina
                </text>
            </g>

            {/* --------- BUCLE DE NODOS INTERACTIVOS --------- */}
            {aulasDinamicas.map(aula => renderAula(aula))}
          </g>
        </svg>
      </div>
    </div>
  );
};
