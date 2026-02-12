/**
 * 3D Scene View Component
 * 
 * WebGL-based 3D scene viewport for puppet manipulation and scene composition.
 * Requirements: 3.1, 3.7
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { PuppetAnimationControls } from './PuppetAnimationControls';
import { exportSceneToVideo, downloadExportedFile, generateExportFilename } from '../../services/sceneExportService';
import { useToast } from '@/hooks/use-toast';
import './sceneView3D.css';
import './puppetAnimationControls.css';
import { useSelectedShot } from '../../store';

interface Camera {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  fov: number;
}

interface Joint {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  parent: string | null;
}

interface Puppet {
  id: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  joints: Joint[];
  pose: string; // Current pose preset name
}

interface Environment {
  type: 'studio' | 'outdoor' | 'indoor' | 'abstract';
  lighting: 'bright' | 'dim' | 'dramatic' | 'natural';
  props: Array<{
    id: string;
    type: string;
    position: { x: number; y: number; z: number };
  }>;
}

/**
 * 3D Object Placement for SceneView3D
 */
interface SceneObject3D {
  placementId: string;
  objectId: string;
  objectName: string;
  modelPath?: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  visible: boolean;
  depth: number;
}

interface SceneView3DProps {
  width: number;
  height: number;
  currentFrame: number;
  onPuppetUpdate?: (puppetData: unknown) => void;
  /** Optional 3D objects to place in the scene */
  sceneObjects?: SceneObject3D[];
  /** Called when object placements change */
  onObjectsChange?: (objects: SceneObject3D[]) => void;
  /** Called when an object is selected */
  onObjectSelect?: (placementId: string | null) => void;
  /** Currently selected object ID */
  selectedObjectId?: string | null;
}

interface PuppetKeyframe {
  frame: number;
  pose: string;
  joints: Record<string, { x: number; y: number; z: number }>;
}

export const SceneView3D: React.FC<SceneView3DProps> = ({
  width,
  height,
  currentFrame,
  onPuppetUpdate,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const buffersRef = useRef<Map<string, WebGLBuffer>>(new Map());
  const { toast } = useToast();
  
  // WebGL Shader sources
  const vertexShaderSource = `
    attribute vec4 aPosition;
    attribute vec4 aNormal;
    attribute vec4 aColor;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform mat4 uNormalMatrix;
    varying vec4 vColor;
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      gl_Position = uProjectionMatrix * uModelViewMatrix * aPosition;
      vPosition = (uModelViewMatrix * aPosition).xyz;
      vNormal = (uNormalMatrix * aNormal).xyz;
      vColor = aColor;
    }
  `;

  const fragmentShaderSource = `
    precision mediump float;
    varying vec4 vColor;
    varying vec3 vNormal;
    varying vec3 vPosition;
    uniform vec3 uLightDirection;
    uniform vec3 uLightColor;
    uniform vec3 uAmbientColor;
    uniform float uShininess;
    uniform int uLightingEnabled;
    void main() {
      vec3 normal = normalize(vNormal);
      vec3 lightDir = normalize(uLightDirection);
      vec3 ambient = uAmbientColor * vColor.rgb;
      float diff = max(dot(normal, lightDir), 0.0);
      vec3 diffuse = uLightColor * diff * vColor.rgb;
      vec3 viewDir = normalize(-vPosition);
      vec3 halfDir = normalize(lightDir + viewDir);
      float spec = pow(max(dot(normal, halfDir), 0.0), uShininess);
      vec3 specular = uLightColor * spec * vec3(0.3);
      vec3 finalColor;
      if (uLightingEnabled == 1) {
        finalColor = ambient + diffuse + specular;
      } else {
        finalColor = vColor.rgb;
      }
      gl_FragColor = vec4(finalColor, vColor.a);
    }
  `;

  // Matrix utility functions
  const createMatrix = () => new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
  
  const perspectiveMatrix = (fov: number, aspect: number, near: number, far: number) => {
    const f = 1.0 / Math.tan(fov / 2);
    const nf = 1 / (near - far);
    return new Float32Array([f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)*nf,-1, 0,0,(2*far*near)*nf,0]);
  };
  
  const translateMatrix = (m: Float32Array, x: number, y: number, z: number) => {
    const r = new Float32Array(m);
    r[12] = m[0]*x + m[4]*y + m[8]*z + m[12];
    r[13] = m[1]*x + m[5]*y + m[9]*z + m[13];
    r[14] = m[2]*x + m[6]*y + m[10]*z + m[14];
    r[15] = m[3]*x + m[7]*y + m[11]*z + m[15];
    return r;
  };
  
  const rotateYMatrix = (m: Float32Array, angle: number) => {
    const c = Math.cos(angle), s = Math.sin(angle);
    const r = new Float32Array(16);
    r[0] = m[0]*c + m[8]*s; r[1] = m[1]*c + m[9]*s; r[2] = m[2]*c + m[10]*s; r[3] = m[3]*c + m[11]*s;
    r[4] = m[4]; r[5] = m[5]; r[6] = m[6]; r[7] = m[7];
    r[8] = m[8]*c - m[0]*s; r[9] = m[9]*c - m[1]*s; r[10] = m[10]*c - m[2]*s; r[11] = m[11]*c - m[3]*s;
    r[12] = m[12]; r[13] = m[13]; r[14] = m[14]; r[15] = m[15];
    return r;
  };
  
  // Initialize WebGL shaders and program
  const initializeWebGL = (gl: WebGLRenderingContext) => {
    try {
      const vs = gl.createShader(gl.VERTEX_SHADER)!;
      gl.shaderSource(vs, vertexShaderSource);
      gl.compileShader(vs);
      if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        console.error('VS error:', gl.getShaderInfoLog(vs)); return;
      }
      
      const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
      gl.shaderSource(fs, fragmentShaderSource);
      gl.compileShader(fs);
      if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        console.error('FS error:', gl.getShaderInfoLog(fs)); return;
      }
      
      const prog = gl.createProgram()!;
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error('Link error:', gl.getProgramInfoLog(prog)); return;
      }
      
      programRef.current = prog;
      gl.useProgram(prog);
      console.log('WebGL initialized successfully');
    } catch (error) {
      console.error('WebGL init error:', error);
    }
  };
  
  // Render WebGL scene
  const renderWebGLScene = (gl: WebGLRenderingContext, program: WebGLProgram) => {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    const aspect = canvasRef.current ? canvasRef.current.width / canvasRef.current.height : 1;
    const projMatrix = perspectiveMatrix(camera.fov * Math.PI / 180, aspect, 0.1, 100);
    
    let mvMatrix = createMatrix();
    mvMatrix = translateMatrix(mvMatrix, -camera.position.x, -camera.position.y, -camera.position.z);
    
    // Set uniforms
    const projLoc = gl.getUniformLocation(program, 'uProjectionMatrix');
    const mvLoc = gl.getUniformLocation(program, 'uModelViewMatrix');
    const normLoc = gl.getUniformLocation(program, 'uNormalMatrix');
    const lightLoc = gl.getUniformLocation(program, 'uLightDirection');
    const lightColorLoc = gl.getUniformLocation(program, 'uLightColor');
    const ambientLoc = gl.getUniformLocation(program, 'uAmbientColor');
    const shininessLoc = gl.getUniformLocation(program, 'uShininess');
    const lightingLoc = gl.getUniformLocation(program, 'uLightingEnabled');
    
    gl.uniformMatrix4fv(projLoc, false, projMatrix);
    gl.uniformMatrix4fv(mvLoc, false, mvMatrix);
    gl.uniformMatrix4fv(normLoc, false, mvMatrix);
    gl.uniform3f(lightLoc, 0.5, 1.0, 0.3);
    gl.uniform3f(lightColorLoc, 1.0, 1.0, 1.0);
    gl.uniform3f(ambientLoc, 0.2, 0.2, 0.3);
    gl.uniform1f(shininessLoc, 32.0);
    gl.uniform1i(lightingLoc, 1);
    
    // Draw simple joint as a colored quad (simplified for demo)
    // In production, this would use proper 3D geometry
    const posLoc = gl.getAttribLocation(program, 'aPosition');
    const normAttrLoc = gl.getAttribLocation(program, 'aNormal');
    const colorLoc = gl.getAttribLocation(program, 'aColor');
    
    // Simple quad for joint visualization
    const vertices = new Float32Array([
      -0.1,-0.1,0, 0.1,-0.1,0, 0.1,0.1,0, -0.1,-0.1,0, 0.1,0.1,0, -0.1,0.1,0
    ]);
    const normals = new Float32Array([
      0,0,1, 0,0,1, 0,0,1, 0,0,1, 0,0,1, 0,0,1
    ]);
    const colors = new Float32Array([
      0.3,0.6,0.9,1, 0.3,0.6,0.9,1, 0.3,0.6,0.9,1,
      0.3,0.6,0.9,1, 0.3,0.6,0.9,1, 0.3,0.6,0.9,1
    ]);
    
    const posBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
    
    const normBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(normAttrLoc);
    gl.vertexAttribPointer(normAttrLoc, 3, gl.FLOAT, false, 0, 0);
    
    const colorBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(colorLoc);
    gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
    
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };
  
  const [camera, setCamera] = useState<Camera>({
    position: { x: 0, y: 1.5, z: 5 },
    rotation: { x: 0, y: 0, z: 0 },
    fov: 60,
  });
  
  const [puppets, setPuppets] = useState<Puppet[]>([
    {
      id: 'puppet-1',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      pose: 'idle',
      joints: [
        { id: 'root', name: 'Root', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: null },
        { id: 'spine', name: 'Spine', position: { x: 0, y: 0.5, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'root' },
        { id: 'neck', name: 'Neck', position: { x: 0, y: 1.2, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'spine' },
        { id: 'head', name: 'Head', position: { x: 0, y: 1.5, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'neck' },
        { id: 'left-shoulder', name: 'L Shoulder', position: { x: -0.3, y: 1.1, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'spine' },
        { id: 'left-elbow', name: 'L Elbow', position: { x: -0.6, y: 0.8, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'left-shoulder' },
        { id: 'left-hand', name: 'L Hand', position: { x: -0.9, y: 0.5, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'left-elbow' },
        { id: 'right-shoulder', name: 'R Shoulder', position: { x: 0.3, y: 1.1, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'spine' },
        { id: 'right-elbow', name: 'R Elbow', position: { x: 0.6, y: 0.8, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'right-shoulder' },
        { id: 'right-hand', name: 'R Hand', position: { x: 0.9, y: 0.5, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'right-elbow' },
        { id: 'left-hip', name: 'L Hip', position: { x: -0.15, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'root' },
        { id: 'left-knee', name: 'L Knee', position: { x: -0.15, y: -0.5, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'left-hip' },
        { id: 'left-foot', name: 'L Foot', position: { x: -0.15, y: -1, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'left-knee' },
        { id: 'right-hip', name: 'R Hip', position: { x: 0.15, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'root' },
        { id: 'right-knee', name: 'R Knee', position: { x: 0.15, y: -0.5, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'right-hip' },
        { id: 'right-foot', name: 'R Foot', position: { x: 0.15, y: -1, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'right-knee' },
      ],
    },
  ]);
  
  const [environment, setEnvironment] = useState<Environment>({
    type: 'studio',
    lighting: 'bright',
    props: [],
  });
  
  const [selectedJoint, setSelectedJoint] = useState<string | null>(null);
  const [posePresets] = useState([
    'idle',
    'walking',
    'running',
    'sitting',
    'waving',
    'pointing',
    'thinking',
    'celebrating',
  ]);
  const [keyframes, setKeyframes] = useState<PuppetKeyframe[]>([]);
  const [showAnimationControls, setShowAnimationControls] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{
    percentage: number;
    message: string;
  } | null>(null);
  
  const [selectedPuppet, setSelectedPuppet] = useState<string | null>('puppet-1');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [webGLSupported, setWebGLSupported] = useState(true);
  
  // -------------------------------------------------------------------------
  // Synchronise the generated rig (if any) from the selected shot into the
  // 3‑D scene. The backend returns a `rigPath` which we expose via the
  // `useSelectedShot` hook. When a rig is present we replace the current
  // puppet list with a placeholder puppet representing the rig. In a full
  // implementation you would load the rig geometry (e.g. from a GLTF file)
  // and populate the `joints` array accordingly.
  // -------------------------------------------------------------------------
  const selectedShot = useSelectedShot();
  
  useEffect(() => {
    if (selectedShot?.rigPath) {
      // Placeholder puppet for the rig – replace with real geometry later.
      const rigPuppet: Puppet = {
        id: 'rig-puppet',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        pose: 'idle',
        joints: [], // TODO: load joints from rig data
      };
      setPuppets([rigPuppet]);
    } else {
      // If no rig is present, fall back to the default demo puppet.
      setPuppets([
        {
          id: 'puppet-1',
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          pose: 'idle',
          joints: [
            { id: 'root', name: 'Root', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: null },
            { id: 'spine', name: 'Spine', position: { x: 0, y: 0.5, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'root' },
            { id: 'neck', name: 'Neck', position: { x: 0, y: 1.2, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'spine' },
            { id: 'head', name: 'Head', position: { x: 0, y: 1.5, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'neck' },
            { id: 'left-shoulder', name: 'L Shoulder', position: { x: -0.3, y: 1.1, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'spine' },
            { id: 'left-elbow', name: 'L Elbow', position: { x: -0.6, y: 0.8, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'left-shoulder' },
            { id: 'left-hand', name: 'L Hand', position: { x: -0.9, y: 0.5, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'left-elbow' },
            { id: 'right-shoulder', name: 'R Shoulder', position: { x: 0.3, y: 1.1, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'spine' },
            { id: 'right-elbow', name: 'R Elbow', position: { x: 0.6, y: 0.8, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'right-shoulder' },
            { id: 'right-hand', name: 'R Hand', position: { x: 0.9, y: 0.5, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'right-elbow' },
            { id: 'left-hip', name: 'L Hip', position: { x: -0.15, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'root' },
            { id: 'left-knee', name: 'L Knee', position: { x: -0.15, y: -0.5, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'left-hip' },
            { id: 'left-foot', name: 'L Foot', position: { x: -0.15, y: -1, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'left-knee' },
            { id: 'right-hip', name: 'R Hip', position: { x: 0.15, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'root' },
            { id: 'right-knee', name: 'R Knee', position: { x: 0.15, y: -0.5, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'right-hip' },
            { id: 'right-foot', name: 'R Foot', position: { x: 0.15, y: -1, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, parent: 'right-knee' },
          ],
        },
      ]);
    }
  }, [selectedShot]);
  
  // Initialize WebGL context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    try {
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        console.warn('WebGL not supported, falling back to 2D canvas');
        setWebGLSupported(false);
        return;
      }
      
      // Type assertion for WebGL context
      const webGLContext = gl as WebGLRenderingContext;
      glRef.current = webGLContext;
      
      // Set up WebGL viewport
      webGLContext.viewport(0, 0, canvas.width, canvas.height);
      webGLContext.clearColor(0.1, 0.1, 0.15, 1.0);
      webGLContext.enable(webGLContext.DEPTH_TEST);
      webGLContext.depthFunc(webGLContext.LEQUAL);
      
    } catch (error) {
      console.error('Failed to initialize WebGL:', error);
      setWebGLSupported(false);
    }
  }, []);
  
  // Render 3D scene
  const renderScene = useCallback(() => {
    const canvas = canvasRef.current;
    const gl = glRef.current;
    
    if (!canvas) return;
    
    if (webGLSupported && gl) {
      // WebGL rendering with proper shaders
      try {
        // Initialize shaders if not already done
        if (!programRef.current) {
          initializeWebGL(gl);
        }

        if (programRef.current) {
          renderWebGLScene(gl, programRef.current);
        }
      } catch (error) {
        console.error('WebGL render error:', error);
      }
    } else {
      // Fallback to 2D canvas rendering
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Clear canvas
      ctx.fillStyle = '#1a1a24';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      
      const gridSize = 50;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Horizontal lines
      for (let i = -5; i <= 5; i++) {
        const y = centerY + i * gridSize;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
      
      // Vertical lines
      for (let i = -5; i <= 5; i++) {
        const x = centerX + i * gridSize;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      
      // Draw center axes
      ctx.strokeStyle = 'rgba(74, 144, 226, 0.5)';
      ctx.lineWidth = 2;
      
      // X axis (red)
      ctx.strokeStyle = '#e74c3c';
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + 100, centerY);
      ctx.stroke();
      
      // Y axis (green)
      ctx.strokeStyle = '#2ecc71';
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX, centerY - 100);
      ctx.stroke();
      
      // Z axis (blue) - simulated perspective
      ctx.strokeStyle = '#3498db';
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX - 70, centerY + 70);
      ctx.stroke();
      
      // Draw puppets
      puppets.forEach((puppet) => {
        const isSelected = puppet.id === selectedPuppet;
        
        // Calculate screen position (simple orthographic projection)
        const screenX = centerX + puppet.position.x * 50;
        const screenY = centerY - puppet.position.y * 50;
        
        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(puppet.rotation.y);
        ctx.scale(puppet.scale.x, puppet.scale.y);
        
        // Draw joints and bones
        puppet.joints.forEach((joint) => {
          const jointScreenX = joint.position.x * 50;
          const jointScreenY = -joint.position.y * 50;
          
          // Draw bone to parent
          if (joint.parent) {
            const parentJoint = puppet.joints.find((j) => j.id === joint.parent);
            if (parentJoint) {
              const parentScreenX = parentJoint.position.x * 50;
              const parentScreenY = -parentJoint.position.y * 50;
              
              ctx.strokeStyle = isSelected ? '#4A90E2' : '#666666';
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.moveTo(parentScreenX, parentScreenY);
              ctx.lineTo(jointScreenX, jointScreenY);
              ctx.stroke();
            }
          }
          
          // Draw joint
          const isJointSelected = joint.id === selectedJoint;
          ctx.fillStyle = isJointSelected ? '#e74c3c' : (isSelected ? '#4A90E2' : '#888888');
          ctx.beginPath();
          ctx.arc(jointScreenX, jointScreenY, isJointSelected ? 8 : 5, 0, Math.PI * 2);
          ctx.fill();
          
          // Draw joint label for selected joint
          if (isJointSelected) {
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(joint.name, jointScreenX, jointScreenY - 12);
          }
        });
        
        // Selection indicator
        if (isSelected) {
          ctx.strokeStyle = '#4A90E2';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(-60, -90, 120, 180);
          ctx.setLineDash([]);
        }
        
        ctx.restore();
        
        // Draw puppet label
        ctx.fillStyle = isSelected ? '#4A90E2' : '#aaaaaa';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${puppet.id} (${puppet.pose})`, screenX, screenY + 100);
      });
      
      // Draw environment props
      environment.props.forEach((prop) => {
        const propScreenX = centerX + prop.position.x * 50;
        const propScreenY = centerY - prop.position.y * 50;
        
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(propScreenX - 15, propScreenY - 15, 30, 30);
        
        ctx.fillStyle = '#95a5a6';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(prop.type, propScreenX, propScreenY + 25);
      });
      
      // Draw camera info
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`Camera: [${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)}]`, 10, 20);
      ctx.fillText(`FOV: ${camera.fov}°`, 10, 35);
      ctx.fillText(`Frame: ${currentFrame}`, 10, 50);
      ctx.fillText(`Environment: ${environment.type} (${environment.lighting})`, 10, 65);
      
      // Draw mode indicator
      ctx.fillStyle = webGLSupported ? '#2ecc71' : '#e67e22';
      ctx.fillText(webGLSupported ? 'WebGL Mode' : '2D Fallback Mode', 10, canvas.height - 10);
    }
  }, [camera, puppets, selectedPuppet, currentFrame, webGLSupported]);
  
  // Animation loop
  useEffect(() => {
    const animate = () => {
      renderScene();
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [renderScene]);
  
  // Mouse interaction handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !selectedPuppet) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    setPuppets((prev) =>
      prev.map((puppet) =>
        puppet.id === selectedPuppet
          ? {
              ...puppet,
              position: {
                ...puppet.position,
                x: puppet.position.x + deltaX * 0.02,
                y: puppet.position.y - deltaY * 0.02,
              },
            }
          : puppet
      )
    );
    
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, selectedPuppet, dragStart]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    
    if (selectedPuppet && onPuppetUpdate) {
      const puppet = puppets.find((p) => p.id === selectedPuppet);
      if (puppet) {
        onPuppetUpdate(puppet);
      }
    }
  }, [selectedPuppet, puppets, onPuppetUpdate]);
  
  // Camera controls
  const handleCameraReset = useCallback(() => {
    setCamera({
      position: { x: 0, y: 1.5, z: 5 },
      rotation: { x: 0, y: 0, z: 0 },
      fov: 60,
    });
  }, []);
  
  const handleCameraMove = useCallback((direction: 'forward' | 'backward' | 'left' | 'right' | 'up' | 'down') => {
    setCamera((prev) => {
      const speed = 0.5;
      const newPosition = { ...prev.position };
      
      switch (direction) {
        case 'forward':
          newPosition.z -= speed;
          break;
        case 'backward':
          newPosition.z += speed;
          break;
        case 'left':
          newPosition.x -= speed;
          break;
        case 'right':
          newPosition.x += speed;
          break;
        case 'up':
          newPosition.y += speed;
          break;
        case 'down':
          newPosition.y -= speed;
          break;
      }
      
      return { ...prev, position: newPosition };
    });
  }, []);
  
  // Pose preset handlers
  const handlePoseChange = useCallback((pose: string) => {
    if (!selectedPuppet) return;
    
    setPuppets((prev) =>
      prev.map((puppet) =>
        puppet.id === selectedPuppet
          ? { ...puppet, pose }
          : puppet
      )
    );
    
    if (onPuppetUpdate) {
      const puppet = puppets.find((p) => p.id === selectedPuppet);
      if (puppet) {
        onPuppetUpdate({ ...puppet, pose });
      }
    }
  }, [selectedPuppet, puppets, onPuppetUpdate]);
  
  // Joint manipulation
  const handleJointRotation = useCallback((jointId: string, axis: 'x' | 'y' | 'z', value: number) => {
    if (!selectedPuppet) return;
    
    setPuppets((prev) =>
      prev.map((puppet) =>
        puppet.id === selectedPuppet
          ? {
              ...puppet,
              joints: puppet.joints.map((joint) =>
                joint.id === jointId
                  ? { ...joint, rotation: { ...joint.rotation, [axis]: value } }
                  : joint
              ),
            }
          : puppet
      )
    );
  }, [selectedPuppet]);
  
  // Environment controls
  const handleEnvironmentChange = useCallback((type: Environment['type']) => {
    setEnvironment((prev) => ({ ...prev, type }));
  }, []);
  
  const handleLightingChange = useCallback((lighting: Environment['lighting']) => {
    setEnvironment((prev) => ({ ...prev, lighting }));
  }, []);
  
  const handleAddProp = useCallback((type: string) => {
    setEnvironment((prev) => ({
      ...prev,
      props: [
        ...prev.props,
        {
          id: `prop-${Date.now()}`,
          type,
          position: { x: Math.random() * 2 - 1, y: 0, z: Math.random() * 2 - 1 },
        },
      ],
    }));
  }, []);
  
  // Keyframe handlers
  const handleKeyframeAdd = useCallback((keyframe: PuppetKeyframe) => {
    setKeyframes((prev) => {
      // Remove existing keyframe at same frame
      const filtered = prev.filter((kf) => kf.frame !== keyframe.frame);
      // Add new keyframe and sort by frame
      return [...filtered, keyframe].sort((a, b) => a.frame - b.frame);
    });
  }, []);
  
  const handleKeyframeRemove = useCallback((frame: number) => {
    setKeyframes((prev) => prev.filter((kf) => kf.frame !== frame));
  }, []);
  
  // Easing function for smooth interpolation (ease-in-out cubic)
  const easeInOutCubic = (t: number) => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  // Linear interpolation helper
  const lerp = (start: number, end: number, t: number) => {
    return start + (end - start) * t;
  };

  // Apply keyframe animation at current frame with smooth interpolation
  useEffect(() => {
    if (!selectedPuppet || keyframes.length === 0) return;
    
    // Find keyframes around current frame
    const prevKeyframe = keyframes.filter((kf) => kf.frame <= currentFrame).pop();
    const nextKeyframe = keyframes.find((kf) => kf.frame > currentFrame);
    
    if (!prevKeyframe) return;
    
    // If we're exactly on a keyframe, apply it directly
    if (prevKeyframe.frame === currentFrame) {
      setPuppets((prev) =>
        prev.map((puppet) =>
          puppet.id === selectedPuppet
            ? { ...puppet, pose: prevKeyframe.pose }
            : puppet
        )
      );
      return;
    }
    
    // Interpolate between keyframes with smooth easing
    if (nextKeyframe) {
      const frameRange = nextKeyframe.frame - prevKeyframe.frame;
      const frameProgress = currentFrame - prevKeyframe.frame;
      const t = easeInOutCubic(frameProgress / frameRange);
      
      // Interpolate pose with smooth transition
      setPuppets((prev) =>
        prev.map((puppet) => {
          if (puppet.id !== selectedPuppet) return puppet;
          
          const currentPose = prevKeyframe.pose;
          const nextPose = nextKeyframe.pose;
          const interpolatedPose = t < 0.5 ? currentPose : nextPose;
          
          return { ...puppet, pose: interpolatedPose };
        })
      );
    }
  }, [currentFrame, keyframes, selectedPuppet]);
  
  // Export scene to video
  const handleExportScene = useCallback(async () => {
    if (!selectedPuppet || keyframes.length === 0) {
      toast({
        title: 'No Keyframes',
        description: 'Please add keyframes before exporting',
        variant: 'warning',
      });
      return;
    }
    
    setIsExporting(true);
    setExportProgress({ percentage: 0, message: 'Starting export...' });
    
    try {
      const blob = await exportSceneToVideo(
        puppets,
        environment,
        keyframes,
        {
          format: 'frames',
          resolution: { width, height },
          fps: 24,
          quality: 'preview',
          startFrame: 0,
          endFrame: Math.max(...keyframes.map((kf) => kf.frame)),
        },
        (progress) => {
          setExportProgress({
            percentage: progress.percentage,
            message: progress.message,
          });
        }
      );
      
      if (blob) {
        const filename = generateExportFilename('frames', selectedPuppet);
        downloadExportedFile(blob, filename);
        setExportProgress({ percentage: 100, message: 'Export complete!' });
        
        setTimeout(() => {
          setIsExporting(false);
          setExportProgress(null);
        }, 2000);
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      setExportProgress({
        percentage: 0,
        message: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(null);
      }, 3000);
    }
  }, [puppets, environment, keyframes, selectedPuppet, width, height]);
  
  return (
    <div className="scene-view-3d">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="scene-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      
      {/* Animation Controls Toggle */}
      <button
        className="animation-controls-toggle"
        onClick={() => setShowAnimationControls(!showAnimationControls)}
        title={showAnimationControls ? 'Hide animation controls' : 'Show animation controls'}
      >
        {showAnimationControls ? '◀' : '▶'} Animation
      </button>
      
      {/* Export Button */}
      <button
        className="export-scene-btn"
        onClick={handleExportScene}
        disabled={isExporting || keyframes.length === 0}
        title="Export scene animation"
      >
        {isExporting ? '⏳ Exporting...' : '📥 Export Scene'}
      </button>
      
      {/* Export Progress */}
      {exportProgress && (
        <div className="export-progress-overlay">
          <div className="export-progress-content">
            <div className="export-progress-bar">
              <div
                className="export-progress-fill"
                style={{ width: `${exportProgress.percentage}%` }}
              />
            </div>
            <div className="export-progress-message">{exportProgress.message}</div>
            <div className="export-progress-percentage">{Math.round(exportProgress.percentage)}%</div>
          </div>
        </div>
      )}
      
      {/* Puppet Animation Controls */}
      {showAnimationControls && selectedPuppet && (
        <PuppetAnimationControls
          currentFrame={currentFrame}
          puppetId={selectedPuppet}
          onKeyframeAdd={handleKeyframeAdd}
          onKeyframeRemove={handleKeyframeRemove}
          keyframes={keyframes}
        />
      )}
      
      {/* 3D Scene Controls */}
      <div className="scene-controls">
        <div className="scene-control-group">
          <span className="control-label">Camera</span>
          <div className="camera-controls">
            <button
              className="scene-control-btn"
              onClick={() => handleCameraMove('forward')}
              title="Move camera forward"
            >
              ↑
            </button>
            <button
              className="scene-control-btn"
              onClick={() => handleCameraMove('left')}
              title="Move camera left"
            >
              ←
            </button>
            <button
              className="scene-control-btn"
              onClick={handleCameraReset}
              title="Reset camera"
            >
              ⟲
            </button>
            <button
              className="scene-control-btn"
              onClick={() => handleCameraMove('right')}
              title="Move camera right"
            >
              →
            </button>
            <button
              className="scene-control-btn"
              onClick={() => handleCameraMove('backward')}
              title="Move camera backward"
            >
              ↓
            </button>
          </div>
          <div className="camera-vertical-controls">
            <button
              className="scene-control-btn"
              onClick={() => handleCameraMove('up')}
              title="Move camera up"
            >
              ⬆
            </button>
            <button
              className="scene-control-btn"
              onClick={() => handleCameraMove('down')}
              title="Move camera down"
            >
              ⬇
            </button>
          </div>
        </div>
        
        <div className="scene-control-group">
          <span className="control-label">Puppet</span>
          <select
            className="puppet-select"
            value={selectedPuppet || ''}
            onChange={(e) => setSelectedPuppet(e.target.value)}
            aria-label="Select puppet"
          >
            {puppets.map((puppet) => (
              <option key={puppet.id} value={puppet.id}>
                {puppet.id}
              </option>
            ))}
          </select>
        </div>
        
        <div className="scene-control-group">
          <span className="control-label">Environment</span>
          <select
            className="environment-select"
            value={environment.type}
            onChange={(e) => handleEnvironmentChange(e.target.value as Environment['type'])}
            aria-label="Select environment type"
          >
            <option value="studio">Studio</option>
            <option value="outdoor">Outdoor</option>
            <option value="indoor">Indoor</option>
            <option value="abstract">Abstract</option>
          </select>
        </div>
        
        <div className="scene-control-group">
          <span className="control-label">Lighting</span>
          <select
            className="lighting-select"
            value={environment.lighting}
            onChange={(e) => handleLightingChange(e.target.value as Environment['lighting'])}
            aria-label="Select lighting type"
          >
            <option value="bright">Bright</option>
            <option value="dim">Dim</option>
            <option value="dramatic">Dramatic</option>
            <option value="natural">Natural</option>
          </select>
        </div>
      </div>
      
      {/* Puppet Transform Controls */}
      {selectedPuppet && (
        <div className="puppet-transform-panel">
          <h4>Puppet Controls</h4>
          {(() => {
            const puppet = puppets.find((p) => p.id === selectedPuppet);
            if (!puppet) return null;
            
            return (
              <>
                {/* Pose Presets */}
                <div className="control-section">
                  <label className="section-label">Pose Preset:</label>
                  <select
                    className="pose-select"
                    value={puppet.pose}
                    onChange={(e) => handlePoseChange(e.target.value)}
                    aria-label="Select pose preset"
                  >
                    {posePresets.map((pose) => (
                      <option key={pose} value={pose}>
                        {pose.charAt(0).toUpperCase() + pose.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Position Controls */}
                <div className="control-section">
                  <label className="section-label">Position:</label>
                  <div className="transform-controls">
                    <div className="transform-row">
                      <label>X:</label>
                      <input
                        type="number"
                        step="0.1"
                        value={puppet.position.x.toFixed(2)}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          setPuppets((prev) =>
                            prev.map((p) =>
                              p.id === selectedPuppet
                                ? { ...p, position: { ...p.position, x: value } }
                                : p
                            )
                          );
                        }}
                        aria-label="Position X coordinate"
                      />
                    </div>
                    <div className="transform-row">
                      <label>Y:</label>
                      <input
                        type="number"
                        step="0.1"
                        value={puppet.position.y.toFixed(2)}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          setPuppets((prev) =>
                            prev.map((p) =>
                              p.id === selectedPuppet
                                ? { ...p, position: { ...p.position, y: value } }
                                : p
                            )
                          );
                        }}
                        aria-label="Position Y coordinate"
                      />
                    </div>
                    <div className="transform-row">
                      <label>Z:</label>
                      <input
                        type="number"
                        step="0.1"
                        value={puppet.position.z.toFixed(2)}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          setPuppets((prev) =>
                            prev.map((p) =>
                              p.id === selectedPuppet
                                ? { ...p, position: { ...p.position, z: value } }
                                : p
                            )
                          );
                        }}
                        aria-label="Position Z coordinate"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Rotation Control */}
                <div className="control-section">
                  <label className="section-label">Rotation Y:</label>
                  <div className="slider-control">
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      step="1"
                      value={puppet.rotation.y * (180 / Math.PI)}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) * (Math.PI / 180);
                        setPuppets((prev) =>
                          prev.map((p) =>
                            p.id === selectedPuppet
                              ? { ...p, rotation: { ...p.rotation, y: value } }
                              : p
                          )
                        );
                      }}
                      aria-label="Puppet rotation Y axis"
                    />
                    <span className="slider-value">{Math.round(puppet.rotation.y * (180 / Math.PI))}°</span>
                  </div>
                </div>
                
                {/* Joint Controls */}
                <div className="control-section">
                  <label className="section-label">Joint Control:</label>
                  <select
                    className="joint-select"
                    value={selectedJoint || ''}
                    onChange={(e) => setSelectedJoint(e.target.value || null)}
                    aria-label="Select joint to control"
                  >
                    <option value="">Select joint...</option>
                    {puppet.joints.map((joint) => (
                      <option key={joint.id} value={joint.id}>
                        {joint.name}
                      </option>
                    ))}
                  </select>
                  
                  {selectedJoint && (() => {
                    const joint = puppet.joints.find((j) => j.id === selectedJoint);
                    if (!joint) return null;
                    
                    return (
                      <div className="joint-controls">
                        <div className="slider-control">
                          <label>Rotation X:</label>
                          <input
                            type="range"
                            min="-90"
                            max="90"
                            step="1"
                            value={joint.rotation.x * (180 / Math.PI)}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) * (Math.PI / 180);
                              handleJointRotation(joint.id, 'x', value);
                            }}
                            aria-label="Joint rotation X axis"
                          />
                          <span className="slider-value">{Math.round(joint.rotation.x * (180 / Math.PI))}°</span>
                        </div>
                        <div className="slider-control">
                          <label>Rotation Y:</label>
                          <input
                            type="range"
                            min="-90"
                            max="90"
                            step="1"
                            value={joint.rotation.y * (180 / Math.PI)}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) * (Math.PI / 180);
                              handleJointRotation(joint.id, 'y', value);
                            }}
                            aria-label="Joint rotation Y axis"
                          />
                          <span className="slider-value">{Math.round(joint.rotation.y * (180 / Math.PI))}°</span>
                        </div>
                        <div className="slider-control">
                          <label>Rotation Z:</label>
                          <input
                            type="range"
                            min="-90"
                            max="90"
                            step="1"
                            value={joint.rotation.z * (180 / Math.PI)}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) * (Math.PI / 180);
                              handleJointRotation(joint.id, 'z', value);
                            }}
                            aria-label="Joint rotation Z axis"
                          />
                          <span className="slider-value">{Math.round(joint.rotation.z * (180 / Math.PI))}°</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                
                {/* Props */}
                <div className="control-section">
                  <label className="section-label">Add Prop:</label>
                  <div className="prop-buttons">
                    <button className="prop-btn" onClick={() => handleAddProp('chair')}>Chair</button>
                    <button className="prop-btn" onClick={() => handleAddProp('table')}>Table</button>
                    <button className="prop-btn" onClick={() => handleAddProp('box')}>Box</button>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}
      
      {/* WebGL Status Indicator */}
      {!webGLSupported && (
        <div className="webgl-warning">
          <span className="warning-icon">⚠️</span>
          <span>WebGL not available. Using 2D fallback mode.</span>
        </div>
      )}
    </div>
  );
};

export default SceneView3D;

