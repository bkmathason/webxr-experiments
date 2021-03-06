import {Clock, Group, PerspectiveCamera, Scene, WebGLRenderer, Color} from "./node_modules/three/build/three.module.js"
import {VRButton} from "./node_modules/three/examples/jsm/webxr/VRButton.js";
import {OrbitControls} from "./node_modules/three/examples/jsm/controls/OrbitControls.js";

import {System} from "https://ecsy.io/build/ecsy.module.js"

export function toRad(theta) {
    return theta*Math.PI/180.0
}

export class ThreeCore {
    constructor() {
        this.vrenabled = true
        this.scene = null
        this.camera = null
        this.renderer = null
        this.stage = null
        this.stagePos = null
        this.stageRot = null
        this.initialized = false
        this.canvas = null
    }

    getCanvas() {
        if(!this.canvas) throw new Error("canvas not initialized")
        return this.canvas
    }
    getStage() {
        return this.stage
    }
    getCamera() {
        return this.camera
    }
    getScene() {
        return this.scene
    }
}

export class InsideVR {

}


export class OrbitalControls {
    constructor() {
        this.autoRotate = false
        this.min = 0
        this.max = 10
    }

}
export class ThreeSystem extends System {
    init() {
        this.count = 0
    }
    execute(delta,time) {
        this.queries.three.results.forEach(ent => this.setupThree(ent))
        this.queries.three.results.forEach(ent => {
            const app = ent.getComponent(ThreeCore)
            if(!app.initialized) return
            this.count++
            if(this.count % 10 === 0) {
                const ch = app.canvas.clientHeight
                const cw = app.canvas.clientWidth
                const h = app.container.clientHeight
                const w = app.container.clientWidth
                if(ch === h && cw === w) return
                app.camera.aspect = w/h
                app.camera.updateProjectionMatrix();
                app.renderer.setSize(w,h);
            }
        })
        this.queries.orbit.added.forEach(ent => {
            const orbit = ent.getMutableComponent(OrbitalControls)
            const three = ent.getComponent(ThreeCore)
            orbit.controls = new OrbitControls(three.camera, three.renderer.domElement)
            three.getCamera().position.set(0,0,3)
            orbit.controls.autoRotate = orbit.autoRotate
            orbit.controls.maxDistance = orbit.max
            orbit.controls.minDistance = orbit.min
        })
        this.queries.orbit.results.forEach(ent => {
            const orbit = ent.getComponent(OrbitalControls)
            orbit.controls.update()
        })
    }
    setupThree(ent) {
        const app = ent.getMutableComponent(ThreeCore)
        if(app.initialized) return
        app.scene = new Scene();
        let width = 400
        let height = 400
        const options = {
             antialias: true
        }
        if(app.canvas) {
            options.canvas = app.canvas
            width = app.canvas.width
            height = app.canvas.height
            app.renderer = new WebGLRenderer( options );
            app.container = app.canvas.parentNode
        } else {
            app.container = document.createElement('div');
            document.body.appendChild(app.container)
            width = window.innerWidth
            height = window.innerHeight
            app.renderer = new WebGLRenderer( options );
            app.canvas = app.renderer.domElement
            app.container.appendChild( app.renderer.domElement );
            window.addEventListener( 'resize', ()=>{
                app.camera.aspect = window.innerWidth / window.innerHeight;
                app.camera.updateProjectionMatrix();
                app.renderer.setSize( window.innerWidth, window.innerHeight );
            }, false );
        }
        app.camera = new PerspectiveCamera( 70, width / height, 0.1, 100 );
        if(app.backgroundColor)  app.scene.background = new Color(app.backgroundColor)
        app.renderer.setPixelRatio( window.devicePixelRatio );
        app.renderer.setSize( width, height );
        app.renderer.gammaOutput = true
        if(app.vrenabled)  app.renderer.vr.enabled = true;
        app.stage = new Group()
        app.stagePos = new Group()
        app.stageRot = new Group()
        app.scene.add(app.stageRot)
        app.stageRot.add(app.stagePos)
        app.stagePos.add(app.stage)

        app.initialized = true
        if(app.vrenabled) {
            const btn = VRButton.createButton(app.renderer,{mode:'immersive-vr'})
            $("body").appendChild(btn)
            app.renderer.vr.addEventListener('sessionstart',()=> ent.addComponent(InsideVR))
            app.renderer.vr.addEventListener('sessionend',()=> ent.removeComponent(InsideVR))
        }
    }

    render(ent) {

    }
}

ThreeSystem.queries = {
    three: {
        components:[ThreeCore],
        listen: {
            added:true,
        }
    },
    orbit: {
        components:[OrbitalControls, ThreeCore],
        listen: {
            added:true,
            removed:true,
        }

    }
}


export function startWorldLoop(app, world) {
    oneWorldTick(app,world)
    const core = app.getMutableComponent(ThreeCore)
    const clock = new Clock();
    core.renderer.setAnimationLoop(()=> {
        const delta = clock.getDelta();
        const elapsedTime = clock.elapsedTime;
        world.execute(delta, elapsedTime)
        core.renderer.render(core.scene, core.camera)
    })
}

export function oneWorldTick(app, world) {
    world.execute(0.1,0)
}
