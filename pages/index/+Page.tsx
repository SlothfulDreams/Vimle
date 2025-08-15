import { VimEditor } from "./VimEditor";
import { MotionFeedback } from "./MotionFeedback";
import { CenteredLayout } from "./CenteredLayout";
import { Navbar } from "./Navbar";
import { Instructions } from "./Instructions";
import { Challenge } from "./Challenge";

export default function VimleGame() {
  return (
    <>
      <Navbar />
      <CenteredLayout>
        <div className="flex flex-col items-center space-y-8">
          <Challenge />
          <Instructions />
          
          {/* Main Content - Editor and Attempts Side by Side */}
          <div className="flex gap-8 items-center justify-center">
            <VimEditor />
            <MotionFeedback />
          </div>
        </div>
      </CenteredLayout>
    </>
  );
}