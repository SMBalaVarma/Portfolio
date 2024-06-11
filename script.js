// 
// ------------- Importing Utilities 
// 
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { Reflector } from "three/addons/objects/Reflector.js";
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { HorizontalBlurShader } from 'three/addons/shaders/HorizontalBlurShader.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import Stats from 'three/addons/libs/stats.module.js'
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
//
// // --------
//
let selectedObjects = [];

// 
// // -------- Bloom effects
//
const BLOOM_SCENE = 1;
const bloomLayer = new THREE.Layers();
bloomLayer.set( BLOOM_SCENE );
const params = {
	threshold: 0,
	strength: 0.09,
	radius: 0.5,
	exposure: 1.2,
    blur: 0.9
};

const darkMaterial = new THREE.MeshBasicMaterial( { color: 'black' } );
const materials = {};
// 
// Canvas
// 
let canvas = document.querySelector('.webgl');
// 
// Sizes 
//
let sizes = {
    height: window.innerHeight,
    width: window.innerWidth
}
//
// Scene
// 
let scene = new THREE.Scene();

let aspectRatio = sizes.width / sizes.height;
//
// Camera
//
let camera = new THREE.PerspectiveCamera(
    65,
    aspectRatio, 
    1, 
    2000); 

camera.position.set(10, 0, 110);
scene.add(camera);
//
// // ------ stats 
//
const stats = new Stats()
document.body.appendChild(stats.dom)
//
// // ----------Renderer
//
let renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setSize(sizes.width, sizes.height)
renderer.render(scene, camera);
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
// renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// // -------------- tone mapping
renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.toneMappingExposure = Math.pow( params.exposure, 4.0 )

document.body.appendChild( renderer.domElement );
//
// // ORBIT CONTROLS
//
let controls = new OrbitControls(camera, canvas);
controls.autoRotateSpeed = 1;
controls.enablePan = true;
controls.enableZoom = true;
// controls.minDistance = 20;
controls.maxDistance = 150;
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.52;
controls.dampingFactor = 0.085;
controls.rotateSpeed = 0.5;

//
// //----------reflectors/mirrors
//
let geometry = new THREE.PlaneGeometry(500, 500);
let Mirror = new Reflector(geometry, {
  clipBias: 0.003,
  textureWidth: window.innerWidth * window.devicePixelRatio,
  textureHeight: window.innerHeight * window.devicePixelRatio,
  color: 0xb5b5b5,
});
Mirror.position.y = -15.85;
Mirror.rotateX(-Math.PI / 2);
scene.add(Mirror);


scene.fog = new THREE.Fog( 0x000000, 50, 200);
// 
// // --------UnRealBloomPass
// 
const renderScene = new RenderPass( scene, camera );

const bloomPass = new UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), 1.5, 0.4, 0.85 );
bloomPass.threshold = params.threshold;
bloomPass.strength = params.strength;
bloomPass.radius = params.radius;
// const vignetteEffect = new ShaderPass(VignetteShader);
// vignetteEffect.renderToScreen = true;
// vignetteEffect.uniforms['darkness'].value=1.5;
const composer = new EffectComposer( renderer );
composer.renderToScreen = false;
composer.addPass( renderScene );
// composer.addPass( vignetteEffect );
composer.addPass( bloomPass );


// ///  mirror blur pass
// const blurPass = new ShaderPass(HorizontalBlurShader);
// blurPass.renderToScreen = false;
// console.log(blurPass.uniforms)
// blurPass.uniforms['h'] = { value: params.blur };
// composer.addPass(blurPass)


const mixPass = new ShaderPass(
	new THREE.ShaderMaterial( {
		uniforms: {
            baseTexture: { value: null },
			bloomTexture: { value: composer.renderTarget2.texture }
		},
        
		vertexShader: document.getElementById( 'vertexshader' ).textContent,
		fragmentShader: document.getElementById( 'fragmentshader' ).textContent,
		defines: {}
	} ), 'baseTexture'
);

mixPass.needsSwap = true;
const outputPass = new OutputPass();
const finalComposer = new EffectComposer( renderer );
finalComposer.addPass( renderScene );
finalComposer.addPass( mixPass );
finalComposer.addPass( outputPass );

function darkenNonBloomed( obj ) {
    
    if ( obj.isMesh && bloomLayer.test( obj.layers ) === false ) {
        
        materials[ obj.uuid ] = obj.material;
		obj.material = darkMaterial;
    }
}

function restoreMaterial( obj ) {
    
    if ( materials[ obj.uuid ] ) {
        obj.material = materials[ obj.uuid ];
		delete materials[ obj.uuid ];
    }
}

//
// //------------ Loading Manager
//
const progressContainer = document.getElementById('loader');

// Create a loading manager
let loadingManager = new THREE.LoadingManager();

loadingManager.onStart = function (url, itemsLoaded, itemsTotal) {
    // Code for when the loading starts
};

loadingManager.onLoad = function () {
    setTimeout(() => {
        progressContainer.classList.add('hide');
        setTimeout(() => {
            progressContainer.style.display = 'none';
        }, 500); // Ensure this matches the CSS transition duration
    }, 50);
};

loadingManager.onProgress = function (url, itemsLoaded, itemsTotal) {
    // Code for loading progress
};

loadingManager.onError = function (url) {
    console.log('There was an error loading ' + url);
};

//
// //----------- Assets 
//
const gltfLoader = new GLTFLoader(loadingManager);

const dracoLoader = new DRACOLoader(loadingManager);
// Set the path to the Draco decoder
dracoLoader.setDecoderPath('./assects/ramen1.glb');

// Add the DRACOLoader to the GLTFLoader
gltfLoader.setDRACOLoader(dracoLoader);
// 
// // --------- 3D Models
//
let model
gltfLoader.load('./assects/Ramen.glb', (gltf) => {
    model = gltf.scene;
    model.position.y=-16;
    model.scale.set(0.2,0.2,0.2)
    scene.add(model);
    model.traverse((child) => {
        if (child.isMesh) {
            // console.log(child.name);
            if(child.userData.name.includes('Object_8') || child.name.includes("Object_4")|| child.name.includes("1142")){
                // child.layers.toggle(BLOOM_SCENE);
                child.layers.enable(BLOOM_SCENE);
            }
        }              
    })
    
})

 /// // pole
let pole 

gltfLoader.load('./assects/pole.glb', (gltf) => {
    pole = gltf.scene;
    pole.position.set(-40,-16,65)
    // pole.scale.set(4,4,4)
    pole.rotation.y = -Math.PI/4
    scene.add(pole);
    pole.traverse((child) => {
        if (child.isMesh) {
            // console.log(child.name);
            if(child.userData.name.includes('002')){
                // child.layers.toggle(BLOOM_SCENE);
                child.layers.enable(BLOOM_SCENE);

            }
            
        }              
    })
})

// HoloGram model
let  HoloGram, points, originalPositions, scatterPositions;
const group = new THREE.Group();
scene.add(group);

gltfLoader.load('./assects/holoGram.glb', (gltf) => {
    HoloGram = gltf.scene;
    group.add(HoloGram); // Add HoloGram to the group

    group.position.set(-35.5, -18, 22.5); // Set the position of the group
    group.scale.set(0.2, 0.2, 0.2);

    const vertices = [];
    const tempPosition = new THREE.Vector3();

    HoloGram.traverse((child) => {
        if (child.isMesh) {
            child.material = new THREE.MeshBasicMaterial({
                wireframe: true,
                color: 0x000000,
                transparent: true,
                opacity: 0
            });
            const sampler = new MeshSurfaceSampler(child).build();

            let sampleCount = 7000; // Default sample count
            // if (child.name === 'Cylinder') {
            //     sampleCount = 50000; // Reduced sample count for this specific mesh
            // } else {
            //     sampleCount = 1000;
            // }

            for (let i = 0; i < sampleCount; i++) {
                sampler.sample(tempPosition);
                vertices.push(tempPosition.x, tempPosition.y, tempPosition.z);
            }
        }
    });

    // points 
    const pointsGeometry = new THREE.BufferGeometry();
    pointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const pointsMaterial = new THREE.PointsMaterial({
        color: 0xffff,
        size: 0.03
    });
    points = new THREE.Points(pointsGeometry, pointsMaterial);
    group.add(points); // Add points to the group

    // // scatter
    originalPositions = Float32Array.from(vertices);
        scatterPositions = new Float32Array(vertices.length);
        for (let i = 0; i < scatterPositions.length; i += 3) {
            scatterPositions[i] = vertices[i] + (Math.random() - 0.5) *20; // X-axis random spread
            scatterPositions[i + 1] = vertices[i + 1] - Math.random() * 500; // Negative Y-axis direction
            scatterPositions[i + 2] = vertices[i + 2] + (Math.random() - 0.5) * 20; // Z-axis random spread
        }

    });
    
// 
// // ------ raycate to scater hologram
//
let holo_ray

window.addEventListener('click', scatter, false);
 holo_ray= new THREE.Raycaster();
function scatter(event) {
    // Update the holo_ray
    holo_ray.setFromCamera({
        x: (event.clientX / renderer.domElement.clientWidth) * 2 - 1,
        y: -(event.clientY / renderer.domElement.clientHeight) * 2 + 1,
    }, camera);

    // Check for intersection
    const intersects = holo_ray.intersectObject(group, true);

    if (intersects.length > 0) {
        animatePoints();
    }
}

function animatePoints() {
    gsap.to(points.geometry.attributes.position.array, {
        duration: 2,
        endArray: scatterPositions,
        onComplete: () => {
            gsap.to(points.geometry.attributes.position.array, {
                duration: 1,
                endArray: originalPositions,
                onUpdate: () => {
                    points.geometry.attributes.position.needsUpdate = true;
                }
            });
        },
        onUpdate: () => {
            points.geometry.attributes.position.needsUpdate = true;
        }
    });
}
//
// //---------- Lights
//
const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);

let Dlight = new THREE.DirectionalLight( 0xffffff, 4);
Dlight.castShadow = true; // default false
scene.add( Dlight );
// 
// // ----------GUI
//

let objDebug= {
    planeColor : '#4a4a4a',
    planeRoughness: 0.321,
    planeMetalness: 0.813,
    planeClearcoat: 0.63,
    planeClearcoatRoughness: 0.076,
    rimMetalness: 1,
};

const gui = new GUI();

			const bloomFolder = gui.addFolder( 'bloom' );

			bloomFolder.add( params, 'threshold', 0.0, 1.0 ).onChange( function ( value ) {

				bloomPass.threshold = Number( value );
				animation();

			} );

			bloomFolder.add( params, 'strength', 0.0, 3 ).onChange( function ( value ) {

				bloomPass.strength = Number( value );
				animation();

			} );

			bloomFolder.add( params, 'radius', 0.0, 1.0 ).step( 0.01 ).onChange( function ( value ) {

				bloomPass.radius = Number( value );
				animation();

			} );

			const toneMappingFolder = gui.addFolder( 'tone mapping' );

			toneMappingFolder.add( params, 'exposure', 0.1, 2 ).onChange( function ( value ) {

				renderer.toneMappingExposure = Math.pow( value, 4.0 );
				animation();

			} );
            const MirrorBlur = gui.addFolder( 'mirror-blur' );

			MirrorBlur.add( params, 'blur', 0, 1 ).onChange( function ( value ) {

                blurPass.uniforms['h'].value = value;				
                animation();

			} );

// // //------ plane mirror 
const planeControlFolder = gui.addFolder('Change plane');

planeControlFolder
    .addColor(objDebug , 'planeColor')
    .onChange(()=>{
        planeMaterial.color.set(objDebug.planeColor)
    })
planeControlFolder
    .add(objDebug, 'planeMetalness')
    .name('Metalness')
    .min(0)
    .max(1)
    .step(0.001)
    .onChange(() => {
        planeMaterial.metalness= objDebug.planeMetalness
    })
planeControlFolder
    .add(objDebug, 'planeRoughness')
    .name('Roughness')
    .min(0)
    .max(1)
    .step(0.001)
    .onChange(() => {
        planeMaterial.roughness = objDebug.planeRoughness
    })
planeControlFolder
    .add(objDebug, 'planeClearcoat')
    .name('Clearcoat')
    .min(0)
    .max(1)
    .step(0.001)
    .onChange(() => {
        planeMaterial.clearcoat = objDebug.planeClearcoat
    })
planeControlFolder
    .add(objDebug, 'planeClearcoatRoughness')
    .name('Clearcoat Roughness')
    .min(0)
    .max(1)
    .step(0.001)
    .onChange(() => {
        planeMaterial.clearcoatRoughness = objDebug.planeClearcoatRoughness
    })


//
// //------ plane geo
//
let planeGeometry = new THREE.PlaneGeometry(600, 600);
let planeMaterial = new THREE.MeshPhysicalMaterial();
let plane = new THREE.Mesh(planeGeometry, planeMaterial);
planeMaterial.opacity = 0.8;
planeMaterial.transparent = true;
planeMaterial.color.set(objDebug.planeColor)
planeMaterial.metalness = objDebug.planeMetalness;
planeMaterial.roughness = objDebug.planeRoughness;
planeMaterial.clearcoat = objDebug.planeClearcoat;
planeMaterial.clearcoatRoughness = objDebug.planeClearcoatRoughness;
plane.receiveShadow = true;
plane.position.y = -15.8;
plane.rotateX(-Math.PI / 2);
scene.add(plane);
// 
// //------- Raycaster
//
const info_rayCaster = new THREE.Raycaster();
function onClick(event) {
        info_rayCaster.setFromCamera(
            {
                x: (event.clientX / renderer.domElement.clientWidth) * 2 - 1,
                y: -(event.clientY / renderer.domElement.clientHeight) * 2 + 1,
            },
            camera
        );
        const intersects = info_rayCaster.intersectObjects(pole.children, true);
        if (intersects.length > 0) {
            // const intersectPoint = intersects[0].point;
            const selectedObject = intersects[0].object;
            switch (selectedObject.name) {
            case "Pub-Cocksign_Pub-About_0":
                actionForABOUT();
                break;
            case "Pub-Cocksign_Pub-Articles_0":
                actionForArticles();
                break;
            case "Pub-Cocksign_Pub-Project_0":
                actionForProject();
                break;
            case "Text_ABOUT":
                actionForABOUT();
                break;
            case "Text_ARTICLES":
                actionForArticles();
                break;
            case "TEXT_PROJECT":
                actionForProject();
                break;
            default:
                break;
                }
        }
}
window.addEventListener('click', onClick, false);
//
// // // ---------texture for plane
//
const textureLoader = new THREE.TextureLoader(loadingManager);
const images = [
    'bg.png',
    'car.png',
    'back.png',
    'about_page.png',
    'about.png',
    'abt.png',
    'exp_page.png',
    'exp.png',
    'experience.png',
    'skills_page.png',
    'skills.png',
    'skl.png',
    'github.png',
    'twitter.png',
    'mail.png',
    'linkedin.png',
    'credits_h.png',
    'credits_l.png',

];

const textures = {};

images.forEach((image) => {
    const name = image.split('.')[0] + '_img';
    textures[name] = textureLoader.load(`./assects/images/${image}`, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
    });
});
console.log(textures)
//
// // ------- project details animation
//
let plane2 , plane3, plane4, plane5, plane6, plane7, back, plane1

    // // ------ background plane
    const planeGeo = new THREE.PlaneGeometry( 11, 10 );
    const planeMrt = new THREE.MeshBasicMaterial( {map:textures.bg_img} );
    plane1 = new THREE.Mesh( planeGeo,planeMrt );
    plane1.position.set(35.8,3,24)

    const planeGeo1 = new THREE.PlaneGeometry( 5.2, 2.3 );
    const planeMrt1 = new THREE.MeshBasicMaterial( {map:textures.back_img} );
    back = new THREE.Mesh( planeGeo1,planeMrt1 );
    back.position.set(38.3,-3.3,24)
    back.name = 'backbtn'

    // //------- project image planes
    const planeGeo2 = new THREE.PlaneGeometry( 3, 4 );

    // // --------- up row
    const planeMrt2 = new THREE.MeshBasicMaterial( {map:textures.car_img} );
    plane2 = new THREE.Mesh( planeGeo2,planeMrt2 );
    plane2.position.set(32.3,5.2,24.1)

    const planeMrt6 = new THREE.MeshBasicMaterial( {map:textures.car_img} );
    plane6 = new THREE.Mesh( planeGeo2,planeMrt6 );
    plane6.position.set(35.8,5.2,24.1)

    const planeMrt7 = new THREE.MeshBasicMaterial( {map:textures.car_img} );
    plane7 = new THREE.Mesh( planeGeo2,planeMrt7 );
    plane7.position.set(39.3,5.2,24.1)

    // // -------- down row
    const planeMrt3 = new THREE.MeshBasicMaterial( {map:textures.car_img} );
    plane3 = new THREE.Mesh( planeGeo2,planeMrt3 );
    plane3.position.set(32.3,0.8,24.1)

    const planeMrt4 = new THREE.MeshBasicMaterial( {map:textures.car_img} );
    plane4 = new THREE.Mesh( planeGeo2,planeMrt4 );
    plane4.position.set(35.8,0.8,24.1)

    const planeMrt5 = new THREE.MeshBasicMaterial( {map:textures.car_img} );
    plane5 = new THREE.Mesh( planeGeo2,planeMrt5 );
    plane5.position.set(39.3,0.8,24.1)

    selectedObjects.push(plane2,plane3,plane4,plane5,plane6,plane7,back)

// // ---------  function to display projects 
function actionForProject() {
    // // ------- Gsap ----
    gsap.to( controls.target, {
        duration: 1,
        x: 36,
        y: 3,
        z: 24,
        onUpdate: function () {
            controls.update();
        }
    } )
    gsap.to(camera.position,{
        x: 36,
        y: 4,
        z: 38,
        duration : 2,
        // ease: "power1.out",
        onUpdate : function(){
        },
        onComplete: function () {
            // Call function to stop camera pan
            controls.enabled = false;
        }
    })
    // // project image planes
    scene.add(plane2 , plane3, plane4, plane5, plane6, plane7, back, plane1)
    ////
}
// 
// //----------------- about 
//
let abt_img , abt_back_btn, skills_btn, about_btn, exp_btn, linkedin_btn, twitter_btn,github_btn, mail_btn

// ---- about image, skills ,experience
  let  abtGeo = new THREE.PlaneGeometry( 15, 6 );
  let  abtMrt = new THREE.MeshBasicMaterial( {map:textures.about_page_img} );
    abt_img = new THREE.Mesh( abtGeo,abtMrt );
    abt_img.position.set(18.6,3.3,16)
    abt_img.rotation.y = -Math.PI/2
    // ------ back btn image
    const backGeo = new THREE.PlaneGeometry( 1.8, 0.8 );
    const backMrt = new THREE.MeshBasicMaterial( {map:textures.back_img} );
    abt_back_btn = new THREE.Mesh( backGeo,backMrt );
    abt_back_btn.position.set(18.59,5.6,9.5)
    abt_back_btn.rotation.y = -Math.PI/2
    abt_back_btn.name = 'about_back_btn'
    ////
    const aSeGeo = new THREE.PlaneGeometry( 0.8, 1.8 );
    //------- about image btn
    const aboutMrt = new THREE.MeshBasicMaterial( {map:textures.about_img} );
    about_btn = new THREE.Mesh( aSeGeo,aboutMrt );
    about_btn.position.set(18.5,5.2,22.4)
    about_btn.rotation.y = -Math.PI/2
    about_btn.name = 'about_btn'
    // ------- skills image btn
    const skillsMrt = new THREE.MeshBasicMaterial( {map:textures.skills_img} );
    skills_btn = new THREE.Mesh( aSeGeo,skillsMrt );
    skills_btn.position.set(18.5,3.5,22.4)
    skills_btn.rotation.y = -Math.PI/2
    skills_btn.name = 'skills_btn'
    // ------- experience image btn
    const expMrt = new THREE.MeshBasicMaterial( {map:textures.experience_img} );
    exp_btn = new THREE.Mesh( aSeGeo,expMrt );
    exp_btn.position.set(18.5,1.6,22.4)
    exp_btn.rotation.y = -Math.PI/2
    exp_btn.name = 'exp_btn'

    //
    const lMgTGeo = new THREE.PlaneGeometry( 0.4, 0.4);
     // ------- linkedin image btn
     const lnkMrt = new THREE.MeshBasicMaterial( {map:textures.linkedin_img} );
     linkedin_btn = new THREE.Mesh( lMgTGeo,lnkMrt );
     linkedin_btn.position.set(18.5,0.8,11)
     linkedin_btn.rotation.y = -Math.PI/2
     linkedin_btn.name = 'linkedin_btn'

     // ------- linkedin image btn
     const gitMrt = new THREE.MeshBasicMaterial( {map:textures.github_img} );
     github_btn = new THREE.Mesh( lMgTGeo,gitMrt );
     github_btn.position.set(18.5,0.8,12)
     github_btn.rotation.y = -Math.PI/2
     github_btn.name = 'github_btn'
     // ------- linkedin image btn
     const mailMrt = new THREE.MeshBasicMaterial( {map:textures.mail_img} );
     mail_btn = new THREE.Mesh( lMgTGeo,mailMrt );
     mail_btn.position.set(18.5,0.8,13)
     mail_btn.rotation.y = -Math.PI/2
     mail_btn.name = 'mail_btn'
     // ------- linkedin image btn
     const twtMrt = new THREE.MeshBasicMaterial( {map:textures.twitter_img} );
     twitter_btn = new THREE.Mesh( lMgTGeo,twtMrt );
     twitter_btn.position.set(18.5,0.8,14)
     twitter_btn.rotation.y = -Math.PI/2
     twitter_btn.name = 'twitter_btn'

    selectedObjects.push(abt_back_btn,abt_img,about_btn,skills_btn,exp_btn,linkedin_btn, twitter_btn,github_btn, mail_btn)

// // ------------- About function to display images
function actionForABOUT() {
    // // ------- Gsap ----
    gsap.to( controls.target, {
        duration: 1,
        x: 18.5,
        y: 3,
        z: 16,
        onUpdate: function () {
            controls.update();
        }
    } )
    gsap.to(camera.position,{
        x: 10,
        y: 3.5,
        z: 16,
        duration : 2,
        // ease: "power1.out",
        onUpdate : function(){
        },
        onComplete: function () {
            // Call function to stop camera pan
            controls.enabled = false;
        }
    })
    // // adding about requried planes
    scene.add( abt_img , abt_back_btn, skills_btn, about_btn, exp_btn, linkedin_btn, twitter_btn,github_btn, mail_btn )
}

// // // ----------Articles plane
let credit_plane,credit_plane2

const creditGeo = new THREE.PlaneGeometry( 8, 5 );
const creditMrt = new THREE.MeshBasicMaterial( {map:textures.credits_h_img} );
credit_plane = new THREE.Mesh( creditGeo,creditMrt );
credit_plane.position.set(32.8,2.7,0)
credit_plane.rotation.y = Math.PI/2
const myAxis = new THREE.Vector3(0, 0, 1);
// rotate the mesh 45 on this axis
credit_plane.rotateOnWorldAxis(myAxis, Math.PI/8);
credit_plane.name ="creditHome"


selectedObjects.push(credit_plane); 

function actionForArticles() {
     // // ------- Gsap ----
     gsap.to( controls.target, {
        duration: 1,
        x: 32.72,
        y: 2.8,
        z: 0,
        onUpdate: function () {
            controls.update();
        }
    } )
    gsap.to(camera.position,{
        x: 40,
        y: 3.5,
        z: 100,
        duration : 2,
        // ease: "power1.out",
        onUpdate : function(){
        }
    })
    gsap.to(camera.position,{
        x: 40,
        y: 3.5,
        z: 0,
        duration : 3,
        // ease: "power1.out",
        onUpdate : function(){
        },
        onComplete: function () {
            // Call function to stop camera pan
            stopCameraPan();
        }
    })
    //

    /// // credit plane
 
scene.add( credit_plane );
}
//
// // -------------- on click on credit plane change img
//

function changePlane(){
    scene.remove(credit_plane)
    // /// ----- credit plane 2
    const crdMrt = new THREE.MeshBasicMaterial( {map:textures.credits_l_img} );
    credit_plane2 = new THREE.Mesh( creditGeo,crdMrt );
    credit_plane2.position.set(32.81,2.7,0)
    credit_plane2.rotation.y = Math.PI/2
    credit_plane2.rotateOnWorldAxis(myAxis, Math.PI/8);
    credit_plane2.name ="crd_back"

    selectedObjects.push(credit_plane2); 
    scene.add( credit_plane2 );
}
// 
// // ------- image raycaster 
//
console.log(selectedObjects);
const image_rayCaster = new THREE.Raycaster();
function onSelect(event) {
    image_rayCaster.setFromCamera(
        {
            x: (event.clientX / renderer.domElement.clientWidth) * 2 - 1,
            y: -(event.clientY / renderer.domElement.clientHeight) * 2 + 1,
        },
        camera
    );
    const intersects = image_rayCaster.intersectObjects(selectedObjects, true);
    if (intersects.length > 0) {
        const intersectPoint = intersects[0].point;
        const selectedObject = intersects[0].object;
        console.log(selectedObject.name);
        console.log(intersectPoint);
            switch (selectedObject.name) {
                case "backbtn":
                case "about_back_btn":
                case "crd_back":
                    closeAbout();
                    break;
                case "creditHome":
                    changePlane();
                    break;
                case "about_btn":
                    changePlaneMaterial( textures.about_page_img);
                    break;
                case "skills_btn":
                    changePlaneMaterial( textures.skills_page_img);
                    break;
                case "exp_btn":
                    changePlaneMaterial(textures.exp_page_img);
                    break; 
                case "twitter_btn":
                    function twitter() {
                        console.log("hey there")
                        window.open('https://x.com/Varma00600037','_blank');
                    }; 
                    twitter()                  
                    break;
                case "github_btn":
                    function github() {
                        console.log("hey there")
                        window.open('https://github.com/SMBalaVarma','_blank');
                    }; 
                    github() 
                    break;
                case "linkedin_btn":
                    function linkedin() {
                        console.log("hey there")
                        window.open('https://www.linkedin.com/in/manikanta-bala-varma-seeram-3282ab24b/','_blank');
                    }; 
                    linkedin() 
                    break;
                case "mail_btn":
                    function mail() {
                        console.log("hey there")
                        window.open('mailto:manikanta.seeram111@gmail.com','_blank');
                    }; 
                    mail() 
                    break;   
                default:
                    break;
            }
        }
}
window.addEventListener('click', onSelect, false);

// // back btn camera animation
function closeAbout() {
    scene.remove(plane1,back, plane2, plane3, plane4, plane5, plane6, plane7);
    scene.remove(credit_plane,credit_plane2,adt_exp_skl)
    scene.remove(abt_img, abt_back_btn, skills_btn, about_btn, exp_btn, linkedin_btn, twitter_btn,github_btn, mail_btn)
    // selectedObjects = [];
    controls.enabled = true;
    gsap.to(controls.target, {
        duration: 1,
        x: IN_TARGET.x,
        y: IN_TARGET.y,
        z: IN_TARGET.z,
        onUpdate: function () {
            controls.update();
        }
    });

    gsap.to(camera.position, {
        x: INI_CAM_POS.x,
        y: INI_CAM_POS.y,
        z: INI_CAM_POS.z,
        duration: 2,
        onUpdate: function () {}
    });
}

const INI_CAM_POS = { x: 10, y:0, z: 110 }; 
const IN_TARGET = { x: 0, y: 0, z: 0 }; 

// // ------ 
let adt_exp_skl
function changePlaneMaterial( newMaterial) {
    abtGeo = new THREE.PlaneGeometry( 15, 6 );
    abtMrt = new THREE.MeshBasicMaterial( {map:newMaterial} );
    adt_exp_skl = new THREE.Mesh( abtGeo,abtMrt );
    adt_exp_skl.position.set(18.6,3.3,16)
    adt_exp_skl.rotation.y = -Math.PI/2;
    scene.add( adt_exp_skl );
    selectedObjects.push(adt_exp_skl);
}
//
// // -------- about raycaste
// //
// const about_rayCaster = new THREE.Raycaster();
// function onAbout(event) {
//     about_rayCaster.setFromCamera(
//         {
//             x: (event.clientX / renderer.domElement.clientWidth) * 2 - 1,
//             y: -(event.clientY / renderer.domElement.clientHeight) * 2 + 1,
//         },
//         camera
//     );
//     const intersects = about_rayCaster.intersectObjects(scene.children, true);
//     if (intersects.length > 0) {
//         const intersectPoint = intersects[0].point;
//         const selectedObject = intersects[0].object;
//         console.log(intersectPoint);
//         console.log(selectedObject.name)
//         }
// }
// window.addEventListener('click', onAbout, false);
// 
// // ------------ video clip
// 
const video = document.getElementById("video");

let videoTexture = new THREE.VideoTexture(video);
videoTexture.colorSpace = THREE.SRGBColorSpace;
// post process texture
// pixel = dot in a digital image ;texel = pixel with a texture image
videoTexture.minFilter = THREE.LinearFilter;
videoTexture.magFilter = THREE.LinearFilter;

let video_geo =  new THREE.PlaneGeometry(16,9);
let video_mrt = new THREE.MeshBasicMaterial({map:videoTexture, side: THREE.FrontSide , toneMapped:false})
let video_plane = new THREE.Mesh(video_geo, video_mrt)
video_plane.position.set(26,7,-16.5)
video_plane.rotation.y = Math.PI/2;
scene.add(video_plane)

let box_geo = new THREE.BoxGeometry(16.5,9.5,0.2)
let box_mrt = new THREE.MeshBasicMaterial({color:new THREE.Color("#00fffb")});
let box = new THREE.Mesh(box_geo,box_mrt)
box.position.set(25.8,7,-16.53)
box.rotation.y = Math.PI/2;
box.layers.enable(BLOOM_SCENE)
scene.add(box)

//
// // ----------- 3D text and fonts
//
const loader = new FontLoader();

// Loading the JSON font file from CDN. Can be a file path too.
loader.load('./assects/fontstyles/Noto Serif_Italic.json', (font) => {

  // Create the text geometry
  const textGeometry = new TextGeometry('THE HUNGRY', {
    font: font,
    size: 1.7,
    height: 0.2,
    curveSegments: 16,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: 1,
  });

  // Create a standard material with red color and 50% gloss
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#000000"),
    roughness: 0.5
  });

  // Geometries are attached to meshes so that they get rendered
  const textMesh = new THREE.Mesh(textGeometry, material);
  // Update positioning of the text
  textMesh.position.set(-3, 26.5, 23.5);
  textMesh.layers.enable(BLOOM_SCENE)
  scene.add(textMesh);
});


// Loading the JSON font file from CDN. Can be a file path too.
loader.load('./assects/fontstyles/Noto Serif_Italic.json', (font) => {

    // Create the text geometry
    const textGeometry = new TextGeometry('RAMEN', {
      font: font,
      size: 1.7,
      height: 0.2,
      curveSegments: 16,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 1,
    });
  
    // Create a standard material with red color and 50% gloss
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#000000"),
      roughness: 0.5
    });
  
    // Geometries are attached to meshes so that they get rendered
    const textMesh = new THREE.Mesh(textGeometry, material);
    // Update positioning of the text
    textMesh.position.set(0, 24, 23.5);
    textMesh.layers.enable(BLOOM_SCENE)
    scene.add(textMesh);
  });
// 
// //--------- RESIZE HANDLER
// 
window.onresize = function () {

    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize( width, height );

    composer.setSize( width, height );
    finalComposer.setSize( width, height );

    animation();
};
// 
// //------- TIME BOUNDED ANIMATION METHOD 3
// 
let animation = () => {
    controls.update();
    group.rotation.y += 0.01;
    scene.traverse( darkenNonBloomed );
	composer.render();
	scene.traverse( restoreMaterial );
	finalComposer.render();
    // renderer.render(scene, camera);
    stats.update()
    requestAnimationFrame(animation);
}

animation()