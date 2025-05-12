import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from "@angular/core";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

@Component({
  selector: "page-room3d",
  template: `
    <ion-header>
      <ion-navbar>
        <ion-title>3D Room Test</ion-title>
        <ion-buttons end>
          <ion-button (click)="toggleWireframe()">
            {{ isWireframe ? 'Solid' : 'Wireframe' }}
          </ion-button>
        </ion-buttons>
      </ion-navbar>
    </ion-header>

    <ion-content>
      <div #container style="width: 100%; height: 100%;"></div>
    </ion-content>
  `,
})
export class Room3DPage implements OnInit, OnDestroy {
  @ViewChild("container")
  containerRef!: ElementRef;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private room!: THREE.Group;
  private isWireframe = false;
  private clock = new THREE.Clock();

  ngOnInit() {
    this.initThree();
    this.animate();
  }

  ngOnDestroy() {
    // Clean up
    this.renderer.dispose();
    window.removeEventListener("resize", this.onWindowResize);
  }

  private initThree() {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue background

    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    this.camera.position.set(5, 5, 5);
    this.camera.lookAt(0, 0, 0);

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.containerRef.nativeElement.appendChild(this.renderer.domElement);

    // Add orbit controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);

    // Create room
    this.createRoom();

    // Handle window resize
    window.addEventListener("resize", this.onWindowResize);
  }

  private createRoom() {
    this.room = new THREE.Group();

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(10, 10);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x808080,
      roughness: 0.8,
      metalness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.room.add(floor);

    // Walls
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.7,
      metalness: 0.1,
    });

    // Back wall
    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 5),
      wallMaterial,
    );
    backWall.position.z = -5;
    backWall.receiveShadow = true;
    this.room.add(backWall);

    // Side walls
    const leftWall = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 5),
      wallMaterial,
    );
    leftWall.position.x = -5;
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    this.room.add(leftWall);

    const rightWall = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 5),
      wallMaterial,
    );
    rightWall.position.x = 5;
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    this.room.add(rightWall);

    // Add some furniture
    this.addFurniture();

    this.scene.add(this.room);
  }

  private addFurniture() {
    // Table
    const tableGeometry = new THREE.BoxGeometry(2, 0.1, 1);
    const tableMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.5,
      metalness: 0.2,
    });
    const table = new THREE.Mesh(tableGeometry, tableMaterial);
    table.position.set(0, 0.5, 0);
    table.castShadow = true;
    table.receiveShadow = true;
    this.room.add(table);

    // Chair
    const chairGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const chairMaterial = new THREE.MeshStandardMaterial({
      color: 0x4b0082,
      roughness: 0.7,
      metalness: 0.1,
    });
    const chair = new THREE.Mesh(chairGeometry, chairMaterial);
    chair.position.set(0, 0.25, 1);
    chair.castShadow = true;
    chair.receiveShadow = true;
    this.room.add(chair);

    // Floating cube
    const cubeGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const cubeMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      roughness: 0.3,
      metalness: 0.8,
    });
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube.position.set(2, 2, -2);
    cube.castShadow = true;
    cube.receiveShadow = true;
    this.room.add(cube);

    // Animate the cube
    const animateCube = () => {
      const time = this.clock.getElapsedTime();
      cube.position.y = 2 + Math.sin(time) * 0.5;
      cube.rotation.x = time;
      cube.rotation.y = time;
      requestAnimationFrame(animateCube);
    };
    animateCube();
  }

  private onWindowResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  toggleWireframe() {
    this.isWireframe = !this.isWireframe;
    this.room.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        (object.material as THREE.MeshStandardMaterial).wireframe =
          this.isWireframe;
      }
    });
  }
}
