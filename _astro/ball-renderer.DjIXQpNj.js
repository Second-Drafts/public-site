import{t as e}from"./magic-8-ball.astro_astro_type_script_index_0_lang.B4EV3BQd.js";import{n as t,t as n}from"./math.Cy1ps70r.js";var r=`"Josefin Sans", sans-serif`,i=600,a=640,o=Math.round(Math.sqrt(3)/2*a);function s(e){return`${i} ${e}px ${r}`}function c(){let e=document.createElement(`canvas`);return e.width=a,e.height=o,e}function l(){return document.fonts.load(s(64)).catch(()=>[])}function u(e,t,n){let r=e.createRadialGradient(t/2,n*.7,0,t/2,n*.7,n);r.addColorStop(0,`#3347f0`),r.addColorStop(1,`#2038d8`),e.fillStyle=r,e.beginPath(),e.moveTo(t/2,0),e.lineTo(t,n),e.lineTo(0,n),e.closePath(),e.fill()}function d(t,n,r,i){let a=e(n.toUpperCase(),{width:r,height:i},{maxFontSize:76,minFontSize:28,lineHeight:1.18,padding:22,measure:(e,n)=>(t.font=s(n),t.measureText(e).width)});t.font=s(a.fontSize),t.textAlign=`center`,t.textBaseline=`middle`,t.shadowColor=`rgba(190, 215, 255, 0.9)`,t.shadowBlur=a.fontSize*.28,t.fillStyle=`#eef3ff`;for(let e of a.lines)t.fillText(e.text,r/2,e.y);t.shadowBlur=0}function f(e,t){let n=e.getContext(`2d`);n.clearRect(0,0,e.width,e.height),u(n,e.width,e.height),d(n,t,e.width,e.height)}var p=1179937895,m=1313821514,h=5130562,g=5126,_=5123,v=4,y={SCALAR:1,VEC2:2,VEC3:3};function b(e){let t=new DataView(e);if(e.byteLength<20||t.getUint32(0,!0)!==p)throw Error(`Not a binary glTF file`);let n=t.getUint32(12,!0);if(t.getUint32(16,!0)!==m)throw Error(`The glTF file has no JSON chunk`);let r=JSON.parse(new TextDecoder().decode(new Uint8Array(e,20,n))),i=20+n;if(t.getUint32(i+4,!0)!==h)throw Error(`The glTF file has no binary chunk`);let a=i+8;function o(e,t,n){let i=r.accessors[e];if(i.componentType!==t||i.type!==n)throw Error(`Accessor ${e} is ${i.componentType} ${i.type}, not ${t} ${n}`);let o=r.bufferViews[i.bufferView??-1];if(!o||o.byteStride)throw Error(`Accessor ${e} isn't tightly packed`);return[a+(o.byteOffset??0)+(i.byteOffset??0),i.count*y[n]]}let s=(t,n)=>new Float32Array(e,...o(t,g,n)),c=t=>new Uint16Array(e,...o(t,_,`SCALAR`));function l(e){if((e.mode??v)!==v||e.indices===void 0)throw Error(`Only indexed triangle meshes are supported`);let{POSITION:t,NORMAL:n,TEXCOORD_0:i}=e.attributes;return{materialName:r.materials[e.material??-1]?.name??``,positions:s(t,`VEC3`),normals:s(n,`VEC3`),uvs:i===void 0?null:s(i,`VEC2`),indices:c(e.indices)}}let u=new Map;for(let e of r.nodes){if(e.rotation||e.scale)throw Error(`Node ${e.name} rotates or scales`);let[t=0,n=0,i=0]=e.translation??[];u.set(e.name,{translation:[t,n,i],primitives:e.mesh===void 0?[]:r.meshes[e.mesh].primitives.map(l)})}return u}var x=[0,0,0,1];function S(e,t,n){let[r,i,a]=[Math.cos(e/2),Math.cos(t/2),Math.cos(n/2)],[o,s,c]=[Math.sin(e/2),Math.sin(t/2),Math.sin(n/2)];return[o*i*a+r*s*c,r*s*a-o*i*c,r*i*c+o*s*a,r*i*a-o*s*c]}function ee([e,t,n],r){let i=Math.hypot(e,t,n),a=Math.sin(r/2)/i;return[e*a,t*a,n*a,Math.cos(r/2)]}function te([e,t,n,r],[i,a,o,s]){return[e*s+r*i+t*o-n*a,t*s+r*a+n*i-e*o,n*s+r*o+e*a-t*i,r*s-e*i-t*a-n*o]}function ne(e,t,n){let r=e[0]*t[0]+e[1]*t[1]+e[2]*t[2]+e[3]*t[3],i=r<0?-1:1,a=Math.acos(Math.min(1,r*i));if(a<.001)return w(C(e,1-n,t,n*i));let o=Math.sin(a);return C(e,Math.sin((1-n)*a)/o,t,i*Math.sin(n*a)/o)}function C(e,t,n,r){return[e[0]*t+n[0]*r,e[1]*t+n[1]*r,e[2]*t+n[2]*r,e[3]*t+n[3]*r]}function w([e,t,n,r]){let i=Math.hypot(e,t,n,r);return[e/i,t/i,n/i,r/i]}function T([e,t,n],[r,i,a,o],s){let[c,l,u]=[r+r,i+i,a+a],[d,f,p]=[r*c,r*l,r*u],[m,h,g]=[i*l,i*u,a*u],[_,v,y]=[o*c,o*l,o*u];return new Float32Array([(1-(m+g))*s,(f+y)*s,(p-v)*s,0,(f-y)*s,(1-(d+g))*s,(h+_)*s,0,(p+v)*s,(h-_)*s,(1-(d+m))*s,0,e,t,n,1])}function E(e){return T(e,x,1)}function D(e,t){let n=new Float32Array(16);for(let r=0;r<4;r++)for(let i=0;i<4;i++){let a=0;for(let n=0;n<4;n++)a+=e[n*4+i]*t[r*4+n];n[r*4+i]=a}return n}function O(e,t,n,r){let i=1/Math.tan(e/2),a=1/(n-r);return new Float32Array([i/t,0,0,0,0,i,0,0,0,0,(r+n)*a,-1,0,0,2*r*n*a,0])}var k=`/models/magic-8-ball.glb`,A=`/models/magic-8-ball-matcaps.webp`,j=5.5,M=1/Math.sqrt(j**2-1),N=.71,P=.1,F=50,I=2,L=E([0,0,-5.5]),re=E([0,0,0]),ie=.286,R=.826,ae=[.0999,.1517,.3811],z=.41,B=48,oe=.6,se=.12,ce=.35,V=0,H=1,U=2,W=4,G=2,le={ShellBlack:{cell:0},ShellRim:{cell:1,viewLookup:!0},DiscWhite:{cell:2},DiscInk:{cell:3},DieBlue:{cell:4,fogged:!0},LiquidIndigo:{cell:5,fogged:!0},WindowGlass:{cell:6,hazyCell:7}},ue=[`projection`,`modelView`,`cell`,`hazyCell`,`haze`,`opacity`,`fogged`,`viewLookup`],de=[`projection`,`modelView`,`opacity`,`fogged`],K=e=>Number.isInteger(e)?e.toFixed(1):String(e),q=e=>`vec${e.length}(${e.map(K).join(`, `)})`,fe=`
	vec3 underWater(vec3 color, float viewDepth) {
		float depth = smoothstep(${K(4.674)}, ${K(5.38)}, viewDepth);
		return mix(color, ${q(ae)}, depth);
	}
`,pe=`#version 300 es
	layout(location = ${V}) in vec3 position;
	layout(location = ${H}) in vec3 normal;
	uniform mat4 projection;
	uniform mat4 modelView;
	out vec3 viewPosition;
	out vec3 viewNormal;

	void main() {
		vec4 positionInView = modelView * vec4(position, 1.0);
		viewPosition = positionInView.xyz;
		viewNormal = mat3(modelView) * normal;
		gl_Position = projection * positionInView;
	}
`,me=`#version 300 es
	precision highp float;
	in vec3 viewPosition;
	in vec3 viewNormal;
	uniform sampler2D matcaps;
	uniform vec2 cell;
	uniform vec2 hazyCell;
	uniform float haze;
	uniform float opacity;
	uniform bool fogged;
	uniform bool viewLookup;
	out vec4 fragColor;
	${fe}

	// Where the ball's own sphere has this normal, seen from the camera. Exact for the shell, which is that sphere.
	vec2 onBall(vec3 normal) {
		return normal.xy / (${K(j)} - normal.z) * ${K(1/M)};
	}

	// three's MeshMatcapMaterial lookup, for walls that face away from the camera further than the sphere ever does.
	vec2 facingView(vec3 normal) {
		vec3 toCamera = normalize(-viewPosition);
		vec3 right = normalize(vec3(toCamera.z, 0.0, -toCamera.x));
		vec3 up = cross(toCamera, right);
		return vec2(dot(right, normal), dot(up, normal));
	}

	vec2 matcapCoordinate(vec3 normal) {
		vec2 onSphere = viewLookup ? facingView(normal) : onBall(normal);
		// Grazing normals stop just inside the baked sphere, off its antialiased edge.
		onSphere *= min(1.0, 0.98 / max(length(onSphere), 0.0001));
		return (vec2(onSphere.x, -onSphere.y) * 0.5 + 0.5) * ${q([1/W,1/G])};
	}

	void main() {
		vec2 inCell = matcapCoordinate(normalize(viewNormal));
		vec3 color = mix(texture(matcaps, cell + inCell).rgb, texture(matcaps, hazyCell + inCell).rgb, haze);
		fragColor = vec4(fogged ? underWater(color, -viewPosition.z) : color, opacity);
	}
`,he=`#version 300 es
	layout(location = ${V}) in vec3 position;
	layout(location = ${U}) in vec2 uv;
	uniform mat4 projection;
	uniform mat4 modelView;
	out vec2 textureCoordinate;
	out float viewDepth;

	void main() {
		vec4 positionInView = modelView * vec4(position, 1.0);
		viewDepth = -positionInView.z;
		textureCoordinate = uv;
		gl_Position = projection * positionInView;
	}
`,ge=`#version 300 es
	precision highp float;
	in vec2 textureCoordinate;
	in float viewDepth;
	uniform sampler2D map;
	uniform float opacity;
	uniform bool fogged;
	out vec4 fragColor;
	${fe}

	void main() {
		vec4 texel = texture(map, textureCoordinate);
		fragColor = vec4(fogged ? underWater(texel.rgb, viewDepth) : texel.rgb, texel.a * opacity);
	}
`;async function _e(e){let t=e.getContext(`webgl2`);if(!t||t.isContextLost())throw Error(`WebGL2 is unavailable`);let[n,r]=await Promise.all([ye(),be()]).catch(e=>{throw ve(t),e});return Me(e,t,n,r)}function ve(e){e.getExtension(`WEBGL_lose_context`)?.loseContext()}async function ye(){let e=await fetch(k);if(!e.ok)throw Error(`Couldn't load ${k}: ${e.status}`);return b(await e.arrayBuffer())}async function be(){let e=new Image;return e.src=A,await e.decode(),e}function J(e,t){let n=e.get(t);if(!n)throw Error(`Ball model is missing the ${t} node`);return n}function xe(e){return 2*Math.atan(M/N/Math.min(1,e))}function Se(e){let t=e;return()=>(t=(t*1664525+1013904223)%4294967296,t/4294967296)}function Ce(){let e=document.createElement(`canvas`);e.width=e.height=256;let t=e.getContext(`2d`),n=Se(8);for(let e=0;e<18;e++){let e=n()*256,r=n()*256,i=40+n()*70,a=t.createRadialGradient(e,r,0,e,r,i);a.addColorStop(0,`rgba(104, 116, 195, 0.55)`),a.addColorStop(1,`rgba(104, 116, 195, 0)`),t.fillStyle=a,t.fillRect(0,0,256,256)}return e}function we(){let e=[0,0,R],t=[.5,.5],n=[];for(let r=0;r<=B;r++){let i=r/B*2*Math.PI;e.push(z*Math.cos(i),z*Math.sin(i),R),t.push((Math.cos(i)+1)/2,(Math.sin(i)+1)/2),r>0&&n.push(r,r+1,0)}return{positions:new Float32Array(e),uvs:new Float32Array(t),indices:new Uint16Array(n)}}function Te(e,t,n,r){let i=e.createProgram();for(let[r,a]of[[e.VERTEX_SHADER,t],[e.FRAGMENT_SHADER,n]]){let t=e.createShader(r);e.shaderSource(t,a),e.compileShader(t),e.attachShader(i,t),e.deleteShader(t)}if(e.linkProgram(i),!e.getProgramParameter(i,e.LINK_STATUS)&&!e.isContextLost())throw Error(`Ball shader failed to link: ${e.getProgramInfoLog(i)}`);return{program:i,uniforms:Object.fromEntries(r.map(t=>[t,e.getUniformLocation(i,t)]))}}function Ee(e,t,n){let r=e.createVertexArray();e.bindVertexArray(r);let i=n.map(([t,n,r])=>{let i=e.createBuffer();return e.bindBuffer(e.ARRAY_BUFFER,i),e.bufferData(e.ARRAY_BUFFER,r,e.STATIC_DRAW),e.enableVertexAttribArray(t),e.vertexAttribPointer(t,n,e.FLOAT,!1,0,0),i}),a=e.createBuffer();return e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,a),e.bufferData(e.ELEMENT_ARRAY_BUFFER,t,e.STATIC_DRAW),e.bindVertexArray(null),{vertexArray:r,indexCount:t.length,buffers:[...i,a]}}function De(e,{positions:t,uvs:n,indices:r}){if(!n)throw Error(`A textured part of the ball has no texture coordinates`);return Ee(e,r,[[V,3,t],[U,2,n]])}function Oe(e){return[e%W/W,Math.floor(e/W)/G]}function Y(e,t,n=E(t.translation)){return t.primitives.map(({materialName:t,positions:r,normals:i,indices:a})=>{let o=le[t];if(!o)throw Error(`Ball model has no shading for the ${t} material`);return{mesh:Ee(e,a,[[V,3,r],[H,3,i]]),offset:n,cell:Oe(o.cell),hazyCell:Oe(o.hazyCell??o.cell),fogged:o.fogged??!1,viewLookup:o.viewLookup??!1}})}function X(e,t,n){let r=e.createTexture();return ke(e,r,t,n),r}function ke(e,t,n,r){e.bindTexture(e.TEXTURE_2D,t),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,r),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,e.NONE),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,n),e.generateMipmap(e.TEXTURE_2D),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR_MIPMAP_LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE)}function Ae(e,t,n,r){return{lit:Te(e,pe,me,ue),textured:Te(e,he,ge,de),ballParts:[`Shell`,`EightDisc`,`Liquid`].flatMap(n=>Y(e,J(t,n))),dieParts:Y(e,J(t,`Die`),re),glassParts:Y(e,J(t,`Window`)),answerFace:De(e,J(t,`AnswerFace`).primitives[0]),cloud:De(e,we()),matcapTexture:X(e,n,!1),cloudTexture:X(e,Ce(),!0),answerTexture:X(e,r,!1)}}function je(e,t){let n=[...t.ballParts,...t.dieParts,...t.glassParts];for(let r of[...n.map(e=>e.mesh),t.answerFace,t.cloud]){e.deleteVertexArray(r.vertexArray);for(let t of r.buffers)e.deleteBuffer(t)}for(let n of[t.matcapTexture,t.cloudTexture,t.answerTexture])e.deleteTexture(n);e.deleteProgram(t.lit.program),e.deleteProgram(t.textured.program)}function Me(e,n,r,i){let a=c(),[o,s]=J(r,`Die`).translation,l=Ae(n,r,i,a),u=O(1,1,P,F),d=.005,p=null;function m(e){e.preventDefault()}function h(){l=Ae(n,r,i,a),p&&S(p)}e.addEventListener(`webglcontextlost`,m),e.addEventListener(`webglcontextrestored`,h);function g(t,n){let r=Math.min(window.devicePixelRatio||1,I);e.width=Math.floor(t*r),e.height=Math.floor(n*r);let i=xe(t/n);u=O(i,t/n,P,F),d=2*j*Math.tan(i/2)/n}function _(e){f(a,e),ke(n,l.answerTexture,a,!1)}function v(e,t,r=0,i=1){let{uniforms:a}=l.lit;n.uniformMatrix4fv(a.modelView,!1,D(t,e.offset)),n.uniform2fv(a.cell,e.cell),n.uniform2fv(a.hazyCell,e.hazyCell),n.uniform1f(a.haze,r),n.uniform1f(a.opacity,i),n.uniform1i(a.fogged,+!!e.fogged),n.uniform1i(a.viewLookup,+!!e.viewLookup),b(e.mesh)}function y(e,t,r,i,a){let{uniforms:o}=l.textured;n.bindTexture(n.TEXTURE_2D,r),n.uniformMatrix4fv(o.modelView,!1,t),n.uniform1f(o.opacity,i),n.uniform1i(o.fogged,+!!a),b(e)}function b(e){n.bindVertexArray(e.vertexArray),n.drawElements(n.TRIANGLES,e.indexCount,n.UNSIGNED_SHORT,0)}function x(e){n.useProgram(e.program),n.uniformMatrix4fv(e.uniforms.projection,!1,u)}function S(r){p=r;let i=D(L,T(r.ballPosition,r.ballRotation,1)),a=D(i,T([o,s,r.answerFaceZ-ie*r.dieScale],r.dieRotation,r.dieScale)),{lit:c,textured:u}=l;n.viewport(0,0,e.width,e.height),n.enable(n.DEPTH_TEST),n.enable(n.CULL_FACE),n.depthMask(!0),n.disable(n.BLEND),n.clear(n.COLOR_BUFFER_BIT|n.DEPTH_BUFFER_BIT),x(c),n.bindTexture(n.TEXTURE_2D,l.matcapTexture);for(let e of l.ballParts)v(e,i);for(let e of l.dieParts)v(e,a);n.depthMask(!1),n.enable(n.BLEND),n.blendFuncSeparate(n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA),x(u),y(l.answerFace,a,l.answerTexture,r.answerOpacity,!0),y(l.cloud,i,l.cloudTexture,r.haze*oe,!1),x(c),n.bindTexture(n.TEXTURE_2D,l.matcapTexture);let d=t(se,ce,r.haze);for(let e of l.glassParts)v(e,i,r.haze,d);n.bindVertexArray(null)}function ee(){e.removeEventListener(`webglcontextlost`,m),e.removeEventListener(`webglcontextrestored`,h),je(n,l),ve(n)}return{get unitsPerPixel(){return d},resize:g,showAnswer:_,draw:S,dispose:ee}}var Ne=.05,Pe=1.6,Fe=.7,Ie=.79,Le=.4,Re=1.6,ze=1,Be=S(.7,-1.1,.5),Ve=x,He=9,Ue=.8,We=1.4,Ge=.45,Ke=.7,Z=e=>1-(1-e)**3,qe=e=>e*e*(3-2*e),Je=()=>performance.now()/1e3,Q=class{current;from;to;startedAt=0;duration=0;ease=qe;constructor(e){this.current=e,this.from=e,this.to=e}get value(){return this.current}get isRunning(){return this.current!==this.to}jumpTo(e){this.from=this.to=this.current=e}animateTo(e,t,n=0,r=qe){this.from=this.current,this.to=e,this.startedAt=Je()+n,this.duration=t,this.ease=r}update(e){if(!this.isRunning)return;let r=n((e-this.startedAt)/this.duration,0,1);this.current=r>=1?this.to:t(this.from,this.to,this.ease(r))}},$=class{stiffness;damping;value=0;target=0;velocity=0;constructor(e,t){this.stiffness=e,this.damping=t}get isAtRest(){return Math.abs(this.velocity)<5e-4&&Math.abs(this.target-this.value)<5e-4}step(e){let t=Math.ceil(e/(1/120)),n=e/t;for(let e=0;e<t;e++){let e=this.stiffness*(this.target-this.value)-this.damping*this.velocity;this.velocity+=e*n,this.value+=this.velocity*n}this.isAtRest&&(this.value=this.target,this.velocity=0)}};async function Ye(e,{reducedMotion:t}){return Xe(await _e(e),e,t)}function Xe(e,r,i){let a=new $(90,11),o=new $(90,11),s=new $(70,9),c=new $(70,9),u=[a,o,s,c],d=new Q(0),f=new Q(0),p=new Q(0),m=new Q(0),h=new Q(0),g=[d,f,p,m,h],_=Be,v=0,y=null,b=null,x=null,C=!1;function w(t){let{width:n,height:r}=t[0].contentRect;n<1||r<1||(e.resize(n,r),N())}function T(e){return{ballPosition:[a.value+Math.sin(e*41)*.045*v,o.value+Math.sin(e*37+1)*.045*v,0],ballRotation:S(s.value+Math.sin(e*29+2)*.16*v,c.value+h.value+Math.sin(e*23+4)*.16*v,Math.sin(e*33+3)*.13*v)}}function E(e,t){v===0||p.value>0||(_=te(ee([Math.sin(t*1.3),Math.cos(t*1.3),Math.sin(t*.7)],v*He*e),_))}function D(){return ne(_,Ve,p.value)}function O(){let e=Z(d.value);return{answerFaceZ:t(Le,Ie,e),dieRotation:D(),dieScale:t(ze,Re,e)}}function k(e,t){for(let t of u)t.step(e);for(let e of g)e.update(t);E(e,t),v=Math.max(0,v-Fe*e)}function A(){return v>0||g.some(e=>e.isRunning)||u.some(e=>!e.isAtRest)}function j(){y?.(),y=null}function M(t){b=null;let n=t/1e3,r=x===null?1/60:Math.min(n-x,Ne);if(x=n,k(r,n),e.draw({...T(n),...O(),answerOpacity:f.value,haze:m.value}),A()){N();return}x=null,j()}function N(){C||b!==null||document.hidden||(b=requestAnimationFrame(M))}function P(){b!==null&&cancelAnimationFrame(b),b=null,x=null}function F(){document.hidden?P():N()}function I(){let e=i?.2:.45;d.animateTo(0,e),f.animateTo(0,.25),_=D(),p.jumpTo(0)}function L(){h.isRunning&&h.animateTo(0,Ge)}function re(){i||(h.jumpTo(Math.PI),h.animateTo(0,We,Ue),N())}async function ie(t){if(j(),await l(),C)return;e.showAnswer(t.text);let n=t.tone===`hazy`;m.animateTo(+!!n,.6);let r=n?Ke:1;i?(d.jumpTo(1),p.jumpTo(1),f.animateTo(r,.3)):(d.animateTo(1,1.5,0,Z),p.animateTo(1,1.7,0,Z),f.animateTo(r,1.3,.4));let a=new Promise(e=>{y=e});return N(),a}function R(e){let t=n(e,0,1);i||(v=Math.min(Pe,v+.5+t*.7)),j(),L(),I(),N()}function ae(t,r){let i=.45;a.target=n(t*e.unitsPerPixel*.5,-.45,i),o.target=n(-r*e.unitsPerPixel*.5,-.45,i),c.target=n(t*.004,-.7,.7),s.target=n(r*.004,-.7,.7),N()}function z(){for(let e of u)e.target=0;N()}let B=new ResizeObserver(w);B.observe(r),document.addEventListener(`visibilitychange`,F);function oe(){C=!0,P(),j(),B.disconnect(),document.removeEventListener(`visibilitychange`,F),e.dispose()}return{introduce:re,shake:R,drag:ae,release:z,reveal:ie,dispose:oe}}export{Ye as createBallRenderer};