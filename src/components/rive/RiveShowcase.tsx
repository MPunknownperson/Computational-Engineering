import { Reveal } from "@/components/Motion";
import { Icon } from "@/components/Icons";
import { RiveReactorLazy } from "./RiveReactorLazy";

const POINTS = [
  { icon: "target" as const, title: "Follows the pointer", body: "Move the mouse (or a finger) across the stage and the character's gaze tracks it — the pointer position is streamed into a Rive number input." },
  { icon: "function" as const, title: "Reads as you type", body: "Every keystroke updates a state-machine input in real time; Enter fires the success trigger and clearing the field fires the fail trigger." },
  { icon: "bolt" as const, title: "Feels the phone move", body: "On a phone, enable motion sensing and shake it: acceleration is converted into intensity and a bump trigger fires past a threshold." },
];

export function RiveShowcase() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-12" aria-labelledby="rive-heading">
      <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.1fr]">
        <Reveal>
          <span className="chip"><Icon name="bolt" size={13} /> Rive · real-time input</span>
          <h2 id="rive-heading" className="h-title mt-4 text-3xl sm:text-4xl">A page that <span className="h-underline">reacts</span> while you work</h2>
          <p className="mt-3 max-w-xl text-slate-600">
            The scene below is a Rive state machine rendered on a canvas. Instead of a looping video, its inputs are
            driven live by what you do: hover position, typed characters and the movement of a mobile device.
          </p>
          <ul className="mt-5 space-y-3">
            {POINTS.map((point) => (
              <li key={point.title} className="flex gap-3">
                <span className="icon-tile icon-tile--sky !h-10 !w-10 !rounded-[12px]"><Icon name={point.icon} size={17} /></span>
                <div><p className="font-extrabold">{point.title}</p><p className="text-sm text-slate-600">{point.body}</p></div>
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={90}>
          <div className="sketch !p-4 sm:!p-5">
            <RiveReactorLazy />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
