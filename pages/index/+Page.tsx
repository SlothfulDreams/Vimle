import { useCallback, useState } from "react";
import { VimEditor } from "./VimEditor";
import { CenteredLayout } from "./CenteredLayout";
import { Navbar } from "./Navbar";
import { Instructions } from "./Instructions";
import { Challenge } from "./Challenge";


export default function VimleGame() {
  const [resetTrigger, setResetTrigger] = useState(0);

  const handleMotionCapture = useCallback(
    (motion: string) => {
      // Simple motion capture without tile logic
      console.log('Motion captured:', motion);
    },
    [],
  );

  return (
    <>
      <Navbar />
      <CenteredLayout>
        <div className="flex flex-col items-center space-y-8">
          <Challenge />
          <Instructions />

          {/* Main Content - Two Editors Side by Side */}
          <div className="flex gap-8 items-center justify-center">
            <VimEditor
              onMotionCapture={handleMotionCapture}
              resetTrigger={resetTrigger}
            />
            <VimEditor
              onMotionCapture={handleMotionCapture}
              resetTrigger={resetTrigger}
            />
          </div>
        </div>
      </CenteredLayout>
    </>
  );
}

