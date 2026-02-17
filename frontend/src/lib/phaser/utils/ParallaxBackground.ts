import Phaser from "phaser";
import { WORLD_THEMES, type WorldTheme } from "@/lib/level-config";
import { GAME_WIDTH, GAME_HEIGHT } from "../constants";

interface ParallaxLayer {
  image?: Phaser.GameObjects.TileSprite;
  graphics?: Phaser.GameObjects.Graphics;
  speed: number;
}

export class ParallaxBackground {
  private scene: Phaser.Scene;
  private layers: ParallaxLayer[] = [];
  private bgImage: Phaser.GameObjects.Image | null = null;
  private groundGraphics: Phaser.GameObjects.Graphics | null = null;
  private currentTheme: WorldTheme = "grassland";
  private particles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create(theme: WorldTheme): void {
    this.currentTheme = theme;
    this.destroy();

    const themeConfig = WORLD_THEMES[theme];
    const textureKey = `bg-${theme}`;
    const hasTexture = this.scene.textures.exists(textureKey);

    if (hasTexture) {
      // Use the PixelLab background image as a tiling background
      this.bgImage = this.scene.add.image(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 - 40,
        textureKey
      );
      // Scale to fill width while maintaining aspect ratio
      const tex = this.scene.textures.get(textureKey);
      const frame = tex.getSourceImage();
      const scaleX = GAME_WIDTH / frame.width;
      const scaleY = (GAME_HEIGHT - 80) / frame.height;
      const scale = Math.max(scaleX, scaleY);
      this.bgImage.setScale(scale);
      this.bgImage.setDepth(0);
    } else {
      // CSS gradient fallback - draw a sky gradient
      this.drawSkyGradient(themeConfig);
    }

    // Draw the ground platform
    this.drawGround(themeConfig);

    // Add special effects
    this.addSpecialEffects(themeConfig);
  }

  private drawSkyGradient(
    theme: (typeof WORLD_THEMES)[WorldTheme]
  ): void {
    const gfx = this.scene.add.graphics();
    const topColor = Phaser.Display.Color.HexStringToColor(theme.sky.top);
    const bottomColor = Phaser.Display.Color.HexStringToColor(theme.sky.bottom);

    for (let y = 0; y < GAME_HEIGHT - 80; y++) {
      const t = y / (GAME_HEIGHT - 80);
      const r = Phaser.Math.Linear(topColor.red, bottomColor.red, t);
      const g = Phaser.Math.Linear(topColor.green, bottomColor.green, t);
      const b = Phaser.Math.Linear(topColor.blue, bottomColor.blue, t);
      gfx.fillStyle(Phaser.Display.Color.GetColor(r, g, b), 1);
      gfx.fillRect(0, y, GAME_WIDTH, 1);
    }
    gfx.setDepth(0);
  }

  private drawMountainLayers(
    theme: (typeof WORLD_THEMES)[WorldTheme]
  ): void {
    // Far mountains (slowest parallax)
    const farGfx = this.scene.add.graphics();
    const farColor = Phaser.Display.Color.HexStringToColor(theme.mountains.far);
    farGfx.fillStyle(farColor.color, 0.6);
    this.drawMountainRange(farGfx, GAME_HEIGHT - 200, 80, 6);
    farGfx.setDepth(1);
    this.layers.push({ graphics: farGfx, speed: 0.1 });

    // Mid mountains
    const midGfx = this.scene.add.graphics();
    const midColor = Phaser.Display.Color.HexStringToColor(theme.mountains.mid);
    midGfx.fillStyle(midColor.color, 0.7);
    this.drawMountainRange(midGfx, GAME_HEIGHT - 160, 60, 8);
    midGfx.setDepth(2);
    this.layers.push({ graphics: midGfx, speed: 0.3 });

    // Near hills
    const nearGfx = this.scene.add.graphics();
    const nearColor = Phaser.Display.Color.HexStringToColor(
      theme.mountains.near
    );
    nearGfx.fillStyle(nearColor.color, 0.8);
    this.drawMountainRange(nearGfx, GAME_HEIGHT - 120, 40, 10);
    nearGfx.setDepth(3);
    this.layers.push({ graphics: nearGfx, speed: 0.5 });
  }

  private drawMountainRange(
    gfx: Phaser.GameObjects.Graphics,
    baseY: number,
    height: number,
    peaks: number
  ): void {
    gfx.beginPath();
    gfx.moveTo(0, GAME_HEIGHT);
    gfx.lineTo(0, baseY);

    const segWidth = GAME_WIDTH / peaks;
    for (let i = 0; i < peaks; i++) {
      const x = i * segWidth + segWidth / 2;
      const peakY = baseY - height * (0.5 + Math.random() * 0.5);
      gfx.lineTo(x - segWidth * 0.3, baseY - height * 0.2);
      gfx.lineTo(x, peakY);
      gfx.lineTo(x + segWidth * 0.3, baseY - height * 0.2);
    }
    gfx.lineTo(GAME_WIDTH, baseY);
    gfx.lineTo(GAME_WIDTH, GAME_HEIGHT);
    gfx.closePath();
    gfx.fillPath();
  }

  private drawGround(
    theme: (typeof WORLD_THEMES)[WorldTheme]
  ): void {
    const groundY = GAME_HEIGHT - 80;

    // Try sidescroller tileset first (generated via PixelLab)
    const ssKey = `tileset-ss-${this.currentTheme}`;
    if (this.scene.textures.exists(ssKey)) {
      const tileGround = this.scene.add.tileSprite(
        GAME_WIDTH / 2, groundY + 40, GAME_WIDTH, 80, ssKey
      );
      tileGround.setDepth(5);
      this.layers.push({ image: tileGround, speed: 0 });
      return;
    }

    // Fallback: procedural side-view pixel-art ground (cross-section)
    this.groundGraphics = this.scene.add.graphics();
    this.groundGraphics.setDepth(5);

    const PX = 4;
    const grassColor = Phaser.Display.Color.HexStringToColor(theme.ground.grass);
    const earthColor = Phaser.Display.Color.HexStringToColor(theme.ground.earth);
    const brickColor = Phaser.Display.Color.HexStringToColor(theme.ground.brick);

    // Seeded deterministic random
    const hash = (x: number, y: number) => {
      const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
      return n - Math.floor(n);
    };

    // Generate a jagged grass surface line (height varies per column)
    const cols = Math.ceil(GAME_WIDTH / PX);
    const grassHeights: number[] = [];
    for (let c = 0; c < cols; c++) {
      const h = hash(c, 999);
      grassHeights[c] = h < 0.3 ? 3 : h < 0.7 ? 2 : 1;
    }

    // Draw ground from top to bottom
    const totalHeight = 80;
    const rows = Math.ceil(totalHeight / PX);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const py = row * PX;
        const r = hash(col, row);
        const grassH = grassHeights[col] * PX;
        let cr: number, cg: number, cb: number;

        if (py < grassH) {
          // Grass surface — vibrant green with pixel variation
          const v = (r - 0.5) * 40;
          cr = grassColor.red * 0.9 + v * 0.2;
          cg = grassColor.green + v;
          cb = grassColor.blue * 0.7 + v * 0.15;
          // Blade highlights
          if (r > 0.8) { cg = Math.min(255, cg + 25); }
          if (r < 0.15) { cr *= 0.7; cg *= 0.75; cb *= 0.6; }
        } else if (py < grassH + 4) {
          // Grass-to-dirt transition — dark roots
          const mix = 0.6;
          cr = grassColor.red * (1 - mix) + earthColor.red * mix - 15;
          cg = grassColor.green * (1 - mix) + earthColor.green * mix - 10;
          cb = grassColor.blue * (1 - mix) + earthColor.blue * mix - 5;
          if (r > 0.6) { cr += 8; cg += 4; }
        } else if (py < 40) {
          // Dirt layer — earthy browns with noise
          const depth = (py - grassH - 4) / (40 - grassH - 4);
          const v = (r - 0.5) * 22;
          cr = earthColor.red + v - depth * 12;
          cg = earthColor.green + v * 0.8 - depth * 8;
          cb = earthColor.blue + v * 0.5 - depth * 5;
          // Pebbles
          if (r > 0.92) { cr += 22; cg += 18; cb += 15; }
          // Root streaks
          if (r < 0.05 && py < 24) { cr *= 0.65; cg *= 0.7; cb *= 0.6; }
          // Dark crevices
          if (r > 0.45 && r < 0.47) { cr *= 0.7; cg *= 0.7; cb *= 0.7; }
        } else {
          // Stone/brick layer — brickwork pattern
          const brickW = 7;
          const brickH = 3;
          const stoneRow = Math.floor((py - 40) / (PX * brickH));
          const offset = stoneRow % 2 === 0 ? 0 : Math.floor(brickW / 2);
          const brickCol = Math.floor((col + offset) / brickW);
          const localCol = (col + offset) % brickW;
          const localRow = Math.floor((py - 40) / PX) % brickH;

          const isMortar = localCol === 0 || localRow === 0;
          const bv = (hash(brickCol, stoneRow) - 0.5) * 18;
          cr = brickColor.red + bv;
          cg = brickColor.green + bv;
          cb = brickColor.blue + bv;

          if (isMortar) {
            cr -= 25; cg -= 22; cb -= 18;
          }

          // Depth darkening
          const sd = (py - 40) / (totalHeight - 40);
          const darken = 1 - sd * 0.35;
          cr *= darken; cg *= darken; cb *= darken;

          // Random crack detail
          if (r > 0.95) { cr *= 0.6; cg *= 0.6; cb *= 0.6; }
        }

        const color = Phaser.Display.Color.GetColor(
          Math.round(Math.max(0, Math.min(255, cr))),
          Math.round(Math.max(0, Math.min(255, cg))),
          Math.round(Math.max(0, Math.min(255, cb)))
        );
        this.groundGraphics.fillStyle(color, 1);
        this.groundGraphics.fillRect(col * PX, groundY + py, PX, PX);
      }
    }

    // Add grass blade sprites on top (decorative blades poking up)
    for (let col = 0; col < cols; col += 2) {
      const r = hash(col, 1234);
      if (r > 0.4) continue;
      const bladeH = PX * (1 + Math.floor(r * 3));
      const bladeX = col * PX + (r > 0.2 ? PX / 2 : 0);
      const v = (r - 0.2) * 30;
      const bladeColor = Phaser.Display.Color.GetColor(
        Math.round(Math.max(0, Math.min(255, grassColor.red * 0.8 + v))),
        Math.round(Math.max(0, Math.min(255, grassColor.green + v + 10))),
        Math.round(Math.max(0, Math.min(255, grassColor.blue * 0.6 + v)))
      );
      this.groundGraphics.fillStyle(bladeColor, 0.9);
      this.groundGraphics.fillRect(bladeX, groundY - bladeH, PX / 2, bladeH);
    }
  }

  private addSpecialEffects(
    theme: (typeof WORLD_THEMES)[WorldTheme]
  ): void {
    if (theme.stars) {
      const gfx = this.scene.add.graphics();
      gfx.setDepth(0.5);
      for (let i = 0; i < 50; i++) {
        const x = Math.random() * GAME_WIDTH;
        const y = Math.random() * (GAME_HEIGHT - 120);
        const r = 0.5 + Math.random() * 1.5;
        gfx.fillStyle(0xffffff, 0.3 + Math.random() * 0.7);
        gfx.fillCircle(x, y, r);
      }
    }

    if (theme.specialEffect === "fireflies") {
      this.createParticleEffect(0xaaff44, 0.6, 20);
    } else if (theme.specialEffect === "snowflakes") {
      this.createParticleEffect(0xffffff, 0.8, 30);
    } else if (theme.specialEffect === "embers") {
      this.createParticleEffect(0xff6600, 0.7, 15);
    } else if (theme.specialEffect === "sparkles") {
      this.createParticleEffect(0xffdd88, 0.5, 25);
    }
  }

  private createParticleEffect(
    color: number,
    alpha: number,
    quantity: number
  ): void {
    // Create a small circle texture for particles
    const key = `particle-${color.toString(16)}`;
    if (!this.scene.textures.exists(key)) {
      const gfx = this.scene.add.graphics();
      gfx.fillStyle(color, 1);
      gfx.fillCircle(4, 4, 4);
      gfx.generateTexture(key, 8, 8);
      gfx.destroy();
    }

    this.particles = this.scene.add.particles(0, 0, key, {
      x: { min: 0, max: GAME_WIDTH },
      y: { min: 0, max: GAME_HEIGHT - 100 },
      lifespan: 4000,
      speed: { min: 10, max: 30 },
      alpha: { start: alpha, end: 0 },
      scale: { start: 0.5, end: 0.1 },
      quantity: 1,
      frequency: Math.floor(3000 / quantity),
      blendMode: "ADD",
    });
    this.particles.setDepth(4);
  }

  scrollLayers(deltaX: number): void {
    for (const layer of this.layers) {
      if (layer.graphics) {
        layer.graphics.x -= deltaX * layer.speed;
      }
    }
  }

  destroy(): void {
    for (const layer of this.layers) {
      layer.image?.destroy();
      layer.graphics?.destroy();
    }
    this.layers = [];
    this.bgImage?.destroy();
    this.bgImage = null;
    this.groundGraphics?.destroy();
    this.groundGraphics = null;
    this.particles?.destroy();
    this.particles = null;
  }
}
