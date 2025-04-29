import { Application, extend, useApplication, useTick } from "@pixi/react";
import { Assets, Container, Sprite, Texture } from "pixi.js";
import { useEffect, useRef, useState } from "react";

// extend tells @pixi/react what Pixi.js components are available
extend({
  Container,
  Sprite,
});

const BunnySprite = ({ x, y }: { x: number; y: number }) => {
  const spriteRef = useRef<Sprite>(null);
  const [texture, setTexture] = useState(Texture.EMPTY);

  // Preload the sprite if it hasn't been loaded yet
  useEffect(() => {
    if (texture === Texture.EMPTY) {
      Assets.load("/assets/bunny.png").then((result) => {
        setTexture(result);
      });
    }
  }, [texture]);

  // Listen for animate update
  useTick((ticker) => {
    if (!spriteRef.current) return;
    // Just for fun, let's rotate mr rabbit a little.
    // * Delta is 1 if running at 100% performance *
    // * Creates frame-independent transformation *
    spriteRef.current.rotation += 0.1 * ticker.deltaTime;
  });

  return (
    <pixiSprite
      ref={spriteRef}
      texture={texture}
      anchor={0.5}
      x={x}
      y={y}
    />
  );
};

const BunnyScene = () => {
  const { app } = useApplication();
  const [bunnies, setBunnies] = useState<{ id: number; x: number; y: number }[]>([]);
  const [idCounter, setIdCounter] = useState(0);

  // Add the first bunny in the center when the app loads
  useEffect(() => {
    if (!app) return;
    
    setBunnies([{ id: 0, x: app.screen.width / 2, y: app.screen.height / 2 }]);
    setIdCounter(1);
  }, [app]);

  // Function to add a bunny that we'll expose to parent
  const addBunny = () => {
    if (!app) return;
    
    const x = Math.random() * app.screen.width;
    const y = Math.random() * app.screen.height;
    
    setBunnies([...bunnies, { id: idCounter, x, y }]);
    setIdCounter(idCounter + 1);
  };

  // Function to reset bunnies that we'll expose to parent
  const resetBunnies = () => {
    setBunnies([]);
  };

  // Make these functions available to the parent
  useEffect(() => {
    if (window) {
      // @ts-ignore
      window.addBunny = addBunny;
      // @ts-ignore
      window.resetBunnies = resetBunnies;
    }
  }, [app, bunnies, idCounter]);

  return (
    <>
      {bunnies.map((bunny) => (
        <BunnySprite key={bunny.id} x={bunny.x} y={bunny.y} />
      ))}
    </>
  );
};

export default function App() {
  const handleAddBunny = () => {
    // @ts-ignore
    if (window.addBunny) window.addBunny();
  };

  const handleReset = () => {
    // @ts-ignore
    if (window.resetBunnies) window.resetBunnies();
  };

  return (
    <div style={{ position: "relative" }}>
      <div style={{ 
        position: "absolute", 
        top: 10, 
        left: 10, 
        zIndex: 100,
        display: "flex",
        gap: 10
      }}>
        <button onClick={handleAddBunny} style={buttonStyle}>Add Bunny</button>
        <button onClick={handleReset} style={buttonStyle}>Reset</button>
      </div>
      
      <Application background={"#1099bb"} resizeTo={window}>
        <BunnyScene />
      </Application>
    </div>
  );
}

const buttonStyle = {
  padding: "8px 12px",
  backgroundColor: "#4CAF50",
  color: "white",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  fontWeight: "bold",
  boxShadow: "0 2px 5px rgba(0,0,0,0.2)"
};
