import Phaser from "phaser";
import { eventBus, GameEvents } from "../EventBus";
import { WORLD_THEMES, type WorldTheme } from "@/lib/level-config";
import { GAME_WIDTH, GAME_HEIGHT } from "../constants";

interface WorldNode {
  id: string;
  worldTheme: WorldTheme;
  name: string;
  subtitle: string;
  x: number;
  y: number;
  state: "locked" | "current" | "completed";
  stars: number;
  gameIds: string[];
}

interface WorldMapData {
  nodes: WorldNode[];
  currentWorldIndex: number;
  studentId: string;
}

const NODE_RADIUS = 28;
const PATH_COLOR = 0xd4a574;
const PATH_COMPLETED_COLOR = 0xffd700;

export class WorldMapScene extends Phaser.Scene {
  private nodes: WorldNode[] = [];
  private nodeSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private playerAvatar: Phaser.GameObjects.Container | null = null;
  private currentNodeIndex = 0;

  constructor() {
    super({ key: "WorldMapScene" });
  }

  init(data: unknown): void {
    const mapData = data as Partial<WorldMapData>;
    if (mapData?.nodes) {
      this.nodes = mapData.nodes;
      this.currentNodeIndex = mapData.currentWorldIndex || 0;
    } else {
      this.createDefaultNodes();
    }
  }

  create(): void {
    // Sky gradient background
    this.drawBackground();

    // Draw connecting paths
    this.drawPaths();

    // Draw world nodes
    this.drawNodes();

    // Draw player avatar at current node
    this.drawPlayerAvatar();

    // Title
    this.add
      .text(GAME_WIDTH / 2, 30, "ADVENTURE MAP", {
        fontSize: "28px",
        color: "#ffffff",
        fontFamily: "Fredoka, sans-serif",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    // Subtitle
    this.add
      .text(GAME_WIDTH / 2, 58, "Choose your world!", {
        fontSize: "14px",
        color: "#ffffffcc",
        fontFamily: "Fredoka, sans-serif",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    // Listen for events
    eventBus.on(GameEvents.SCENE_CHANGE, (detail) => {
      const { scene } = detail as { scene: string };
      if (scene === "WorldMapScene") {
        this.scene.bringToTop("WorldMapScene");
      }
    });
  }

  private createDefaultNodes(): void {
    const themes: WorldTheme[] = [
      "grassland",
      "forest",
      "mountain",
      "sunset",
      "night",
      "cloud_kingdom",
    ];

    // S-curve layout positions
    const positions = [
      { x: 160, y: 420 },
      { x: 380, y: 340 },
      { x: 580, y: 420 },
      { x: 780, y: 340 },
      { x: 580, y: 220 },
      { x: 380, y: 140 },
    ];

    this.nodes = themes.map((theme, i) => {
      const config = WORLD_THEMES[theme];
      return {
        id: `world-${i}`,
        worldTheme: theme,
        name: config.name,
        subtitle: config.subtitle,
        x: positions[i].x,
        y: positions[i].y,
        state: i === 0 ? "current" : i < 1 ? "completed" : "locked",
        stars: 0,
        gameIds: [],
      };
    });
  }

  private drawBackground(): void {
    const gfx = this.add.graphics();

    // Green grassy map background
    const topColor = Phaser.Display.Color.HexStringToColor("#2D5A27");
    const bottomColor = Phaser.Display.Color.HexStringToColor("#4A7C3F");

    for (let y = 0; y < GAME_HEIGHT; y++) {
      const t = y / GAME_HEIGHT;
      const r = Phaser.Math.Linear(topColor.red, bottomColor.red, t);
      const g = Phaser.Math.Linear(topColor.green, bottomColor.green, t);
      const b = Phaser.Math.Linear(topColor.blue, bottomColor.blue, t);
      gfx.fillStyle(Phaser.Display.Color.GetColor(r, g, b), 1);
      gfx.fillRect(0, y, GAME_WIDTH, 1);
    }

    // Decorative trees/bushes (random placement)
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(20, GAME_WIDTH - 20);
      const y = Phaser.Math.Between(80, GAME_HEIGHT - 20);
      const size = Phaser.Math.Between(8, 18);

      // Check not too close to any node
      const tooClose = this.nodes.some(
        (n) =>
          Math.abs(n.x - x) < 60 && Math.abs(n.y - y) < 60
      );
      if (tooClose) continue;

      gfx.fillStyle(0x1a4d1a, 0.5);
      gfx.fillCircle(x, y, size);
      gfx.fillStyle(0x2d7a2d, 0.6);
      gfx.fillCircle(x - 2, y - 3, size * 0.8);
    }
  }

  private drawPaths(): void {
    const gfx = this.add.graphics();

    for (let i = 0; i < this.nodes.length - 1; i++) {
      const from = this.nodes[i];
      const to = this.nodes[i + 1];

      const isCompleted =
        from.state === "completed" && to.state !== "locked";

      // Draw path shadow
      gfx.lineStyle(10, 0x000000, 0.2);
      this.drawCurvedPath(gfx, from.x, from.y + 3, to.x, to.y + 3);

      // Draw path
      gfx.lineStyle(
        8,
        isCompleted ? PATH_COMPLETED_COLOR : PATH_COLOR,
        isCompleted ? 1 : 0.6
      );
      this.drawCurvedPath(gfx, from.x, from.y, to.x, to.y);

      // Dashed overlay for locked paths
      if (to.state === "locked") {
        gfx.lineStyle(3, 0x000000, 0.3);
        this.drawDashedPath(gfx, from.x, from.y, to.x, to.y);
      }
    }
  }

  private drawCurvedPath(
    gfx: Phaser.GameObjects.Graphics,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): void {
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2 - 30;
    const curve = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(x1, y1),
      new Phaser.Math.Vector2(midX, midY),
      new Phaser.Math.Vector2(x2, y2)
    );
    const points = curve.getPoints(20);
    gfx.beginPath();
    gfx.moveTo(points[0].x, points[0].y);
    for (let j = 1; j < points.length; j++) {
      gfx.lineTo(points[j].x, points[j].y);
    }
    gfx.strokePath();
  }

  private drawDashedPath(
    gfx: Phaser.GameObjects.Graphics,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): void {
    const steps = 15;
    for (let j = 0; j < steps; j += 2) {
      const t1 = j / steps;
      const t2 = (j + 1) / steps;
      const px1 = Phaser.Math.Linear(x1, x2, t1);
      const py1 = Phaser.Math.Linear(y1, y2, t1);
      const px2 = Phaser.Math.Linear(x1, x2, t2);
      const py2 = Phaser.Math.Linear(y1, y2, t2);
      gfx.lineBetween(px1, py1, px2, py2);
    }
  }

  private drawNodes(): void {
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      const container = this.add.container(node.x, node.y);

      const themeConfig = WORLD_THEMES[node.worldTheme];
      const baseColor = Phaser.Display.Color.HexStringToColor(
        themeConfig.sky.top
      ).color;

      // Node circle shadow
      const shadow = this.add.circle(3, 3, NODE_RADIUS + 2, 0x000000, 0.3);
      container.add(shadow);

      // Node circle
      const circle = this.add.circle(
        0,
        0,
        NODE_RADIUS,
        node.state === "locked" ? 0x555555 : baseColor,
        1
      );
      circle.setStrokeStyle(
        3,
        node.state === "current"
          ? 0xffd700
          : node.state === "completed"
          ? 0x44ff44
          : 0x888888
      );
      container.add(circle);

      // World number
      const numText = this.add.text(0, -2, `${i + 1}`, {
        fontSize: "20px",
        color: node.state === "locked" ? "#888888" : "#ffffff",
        fontFamily: "Fredoka, sans-serif",
        stroke: "#000000",
        strokeThickness: 3,
      });
      numText.setOrigin(0.5);
      container.add(numText);

      // World name below
      const nameText = this.add.text(0, NODE_RADIUS + 10, node.name, {
        fontSize: "11px",
        color: "#ffffff",
        fontFamily: "Fredoka, sans-serif",
        stroke: "#000000",
        strokeThickness: 2,
      });
      nameText.setOrigin(0.5);
      container.add(nameText);

      // Stars for completed worlds
      if (node.state === "completed" && node.stars > 0) {
        for (let s = 0; s < Math.min(node.stars, 3); s++) {
          const star = this.add.text(-12 + s * 12, -NODE_RADIUS - 14, "★", {
            fontSize: "12px",
            color: "#FFD700",
            stroke: "#000000",
            strokeThickness: 1,
          });
          star.setOrigin(0.5);
          container.add(star);
        }
      }

      // Lock icon for locked nodes
      if (node.state === "locked") {
        const lock = this.add.text(0, -4, "🔒", {
          fontSize: "18px",
        });
        lock.setOrigin(0.5);
        container.add(lock);
      }

      // Pulse animation for current node
      if (node.state === "current") {
        this.tweens.add({
          targets: circle,
          scaleX: 1.1,
          scaleY: 1.1,
          duration: 800,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      }

      // Interactive
      if (node.state !== "locked") {
        circle.setInteractive({ useHandCursor: true });
        circle.on("pointerdown", () => {
          this.onNodeClicked(i);
        });
        circle.on("pointerover", () => {
          this.tweens.add({
            targets: container,
            scaleX: 1.15,
            scaleY: 1.15,
            duration: 150,
            ease: "Back.easeOut",
          });
        });
        circle.on("pointerout", () => {
          this.tweens.add({
            targets: container,
            scaleX: 1,
            scaleY: 1,
            duration: 150,
          });
        });
      }

      this.nodeSprites.set(node.id, container);
    }
  }

  private drawPlayerAvatar(): void {
    const currentNode = this.nodes[this.currentNodeIndex];
    if (!currentNode) return;

    this.playerAvatar = this.add.container(
      currentNode.x,
      currentNode.y - NODE_RADIUS - 20
    );

    // Use player idle sprite if available
    if (this.textures.exists("player-idle")) {
      const sprite = this.add.sprite(0, 0, "player-idle");
      sprite.setScale(2);
      this.playerAvatar.add(sprite);
    } else {
      // Fallback circle avatar
      const avatar = this.add.circle(0, 0, 12, 0x4488ff, 1);
      avatar.setStrokeStyle(2, 0xffffff);
      this.playerAvatar.add(avatar);
    }

    this.playerAvatar.setDepth(100);

    // Floating animation
    this.tweens.add({
      targets: this.playerAvatar,
      y: currentNode.y - NODE_RADIUS - 28,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private onNodeClicked(index: number): void {
    const node = this.nodes[index];
    if (node.state === "locked") return;

    // Move player to clicked node
    if (this.playerAvatar && index !== this.currentNodeIndex) {
      this.tweens.killTweensOf(this.playerAvatar);
      this.tweens.add({
        targets: this.playerAvatar,
        x: node.x,
        y: node.y - NODE_RADIUS - 24,
        duration: 500,
        ease: "Power2",
        onComplete: () => {
          this.currentNodeIndex = index;
          // Restart float
          if (this.playerAvatar) {
            this.tweens.add({
              targets: this.playerAvatar,
              y: node.y - NODE_RADIUS - 28,
              duration: 1000,
              yoyo: true,
              repeat: -1,
              ease: "Sine.easeInOut",
            });
          }
          // Emit event for React to handle navigation
          eventBus.emit(GameEvents.LEVEL_START, {
            worldTheme: node.worldTheme,
            bossType: "dark_sorcerer",
            itemType: "multiple_choice",
            questionData: {
              question: "",
              options: [],
              itemType: "",
            },
            progress: 0,
            maxProgress: 1,
            streak: 0,
            points: 0,
          });
        },
      });
    } else {
      // Same node - emit start
      eventBus.emit(GameEvents.LEVEL_START, {
        worldTheme: node.worldTheme,
        bossType: "dark_sorcerer",
        itemType: "multiple_choice",
        questionData: {
          question: "",
          options: [],
          itemType: "",
        },
        progress: 0,
        maxProgress: 1,
        streak: 0,
        points: 0,
      });
    }
  }
}
