import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import EventEmitter from "./EventEmitter.js";

export default class Resources extends EventEmitter{
    constructor(sources){
        super();

        this.sources = sources;
        this.items = {};
        this.modelPromises = new Map();
        this.toLoad = this.sources.length;
        this.loaded = 0;
        this.setLoaders();
        this.startLoading();
    }

    setLoaders(){
        this.loaders = {};
        this.loaders.gltfLoader = new GLTFLoader();
        this.loaders.textureLoader = new THREE.TextureLoader();
        this.loaders.cubeTextureLoader = new THREE.CubeTextureLoader();
    }

    startLoading(){
        if(this.sources.length == 0){
            this.trigger("ready");
            return;
        }
        for(const source of this.sources){
            if(source.type === "gltfModel"){
                this.loaders.gltfLoader.load(
                    source.path,
                    (file) => {
                        this.sourceLoaded(source,file)
                    }
                );
            }else if(source.type === "texture"){
                this.loaders.textureLoader.load(
                    source.path,
                    (file) => {
                        this.sourceLoaded(source,file)
                    }
                );
            }else if(source.type === "cubeTexture"){
                this.loaders.cubeTextureLoader.load(
                    source.path,
                    (file) => {
                        this.sourceLoaded(source,file);
                    }
                );
            }
        }
    }

    sourceLoaded(source, file){
        this.items[source.name] = file;

        this.loaded++;

        if(this.loaded == this.toLoad){
            this.trigger("ready");
        }
    }

    loadModel(path, onProgress) {
        if (this.modelPromises.has(path)) return this.modelPromises.get(path);

        const request = new Promise((resolve, reject) => {
            this.loaders.gltfLoader.load(
                path,
                resolve,
                (event) => {
                    if (!event.lengthComputable || !onProgress) return;
                    onProgress(event.loaded / event.total);
                },
                reject
            );
        });

        this.modelPromises.set(path, request);
        request.catch(() => this.modelPromises.delete(path));

        return request;
    }
}
