// The commentator's lines, by event group. Every group is a list of variants so he never repeats himself.
// Delivered by ElevenLabs v3 (audio tags in [brackets] steer the performance and are never spoken).
// Keep "Shito" = "Shitor", "Dumsor" = "Doomsor", "Sankofa" = "Sunkofa" so the voice says them right.
export const LINES = {
  kickoff: [
    "[excited] And we're UNDERWAY! I have a FEELING about this one!",
    "[gasps] Kick off! My hands are already shaking!",
    "[shouting] Here we go! I'll never be the same man again!",
    "[excited] We're off! Hold on to your hats!",
  ],
  goal_you: [
    "[screaming] GOAL! Oh my WORD, GOAL! I can't BREATHE!",
    "[shouting] It's IN! It's IN! Somebody hold me!",
    "[screaming] GOAL! In Europe we'd call that a miracle!",
    "[crying] I have NEVER seen anything like that! GOAL!",
    "[screaming] The net is BULGING! The beauty of it!",
  ],
  goal_cpu: [
    "[shouting] The MACHINE scores! Is that even allowed?!",
    "[sobbing] Oh no, no, no! The CPU has scored!",
    "[screaming] A robot! A ROBOT has scored!",
    "[crying] Cruel, cruel football! I am devastated!",
    "[shouting] It's in! I want to speak to a manager!",
  ],
  equaliser: [
    "[screaming] AND IT'S LEVEL! I don't believe it!",
    "[shouting] EQUALISER! You couldn't write this!",
    "[gasps] Back on terms! My poor heart!",
  ],
  rout_you: [
    "[laughs] This isn't football, it's a MASSACRE!",
    "[shouting] Running riot! Show NO mercy, lad!",
    "[gasps] A thrashing! I shall need to lie down!",
  ],
  rout_cpu: [
    "[sobbing] A catastrophe! The machine is toying with us!",
    "[crying] The humiliation! My mother is watching!",
    "[sobbing] Please, somebody, stop the match!",
  ],
  save: [
    "[gasps] What a SAVE! How is that even HUMAN?!",
    "[shouting] Kept out! I've lost a year of my life!",
    "[screaming] STOPPED! That's robbery in broad daylight!",
    "[gasps] A hand! A single, glorious hand!",
    "[shouting] I don't believe it! Saved!",
  ],
  shot: [
    "[shouting] He lets fly!",
    "[gasps] Here comes a shot!",
    "[excited] He's had a go! Why not!",
    "[shouting] Oh, he HAS shot!",
  ],
  slide: [
    "[gasps] That is a TACKLE! Somebody's getting a letter!",
    "[shouting] Studs up! Well, no studs, but the spirit!",
    "[gasps] Stolen right off his toe! Disgraceful!",
    "[shouting] Bone-rattling! You'd never see that at Wembley!",
  ],
  shito_you: [
    "[gasps] He's taken the SHITOR! I have no idea what happens next!",
    "[shouting] The ball is GLOWING! Is that legal?!",
    "[gasps] He's armed the ball! Heaven help the defenders!",
    "[shouting] Shitor! My blood pressure is up!",
  ],
  shito_burn: [
    "[screaming] IT'S GONE THROUGH THEM! They're on FIRE!",
    "[shouting] BURNED them! Never seen that in my LIFE!",
    "[screaming] Through one! Through TWO! THREE! Not at the Emirates!",
    "[gasps] They're spinning! Call the paramedics!",
  ],
  shito_cpu: [
    "[gasps] The CPU has set the ball alight! Brace!",
    "[shouting] The machine has the shitor! RUN, you fools!",
    "[gasps] A fireball! I want to go home!",
  ],
  dumsor_you: [
    "[shouting] DOOMSOR! The lights are out! They've STOPPED!",
    "[gasps] Total darkness! The whole team's turned to stone!",
    "[screaming] The power cut to END all power cuts!",
    "[gasps] Not a muscle! Is this a museum?!",
  ],
  dumsor_cpu: [
    "[sobbing] They've cut the lights! My lads are statues!",
    "[shouting] Doomsor! The dirtiest trick in football! I LOVE it!",
    "[crying] I can't see! Is somebody there?!",
    "[gasps] We're frozen solid! Can't anyone move?!",
  ],
  trotro_you: [
    "[shouting] Here comes the trotro! He's coming THROUGH!",
    "[gasps] He's boarded a minibus! Through the defence!",
    "[screaming] Beep beep! Out of the WAY!",
    "[shouting] Going down like skittles!",
  ],
  trotro_cpu: [
    "[gasps] The machine's on a trotro! DIVE!",
    "[shouting] He's FLATTENED the lot of them!",
    "[sobbing] They've run us over! Actually run us over!",
  ],
  sankofa_you: [
    "[screaming] THE GOAL HAS BEEN UNSCORED! This is witchcraft!",
    "[gasps] Wait. It was a goal, and now it ISN'T a goal?!",
    "[shouting] He's turned back time! I demand an inquiry!",
    "[screaming] They can't DO that! They've just DONE that!",
    "[gasps] Wiped off the scoreboard! I'm hallucinating!",
  ],
  sankofa_cpu: [
    "[sobbing] They've reversed our goal! It was OURS!",
    "[shouting] Sunkofa! They've taken it back! Our beautiful goal!",
    "[gasps] I SAW it go in! And now it hasn't happened!",
    "[crying] Daylight robbery! Time itself has been robbed!",
  ],
  sankofa_back: [
    "[shouting] Sunkofa! They're all sprinting back!",
    "[gasps] Everyone running home! Goal-side! Smart!",
    "[excited] Going back to fetch it! Sunkofa!",
  ],
  obolo: [
    "[gasps] He's gone HUGE! The man is a house!",
    "[shouting] Obolo! The size of a bus! Nobody can move him!",
    "[gasps] Where did that come from?!",
  ],
  magnet: [
    "[gasps] The ball is glued to his boot! It's a magnet!",
    "[shouting] A MAGNETIC first touch!",
    "[excited] The ball flew straight to his feet! Spooky!",
  ],
  azonto: [
    "[laughs] He's DANCING past them! Azonto! Give him a medal!",
    "[shouting] The FOOTWORK! They can't touch him!",
    "[gasps] He's showboating and nobody can stop it!",
  ],
  juju: [
    "[screaming] WHAT IS HAPPENING?! BALLS, plural, from the CPU! This is not in ANY rulebook!",
    "[screaming] JUJU! I have NEVER seen the like! Check the rules!",
    "[sobbing] BALLS everywhere! They're purple! The CPU has summoned something!",
    "[shouting] NO! The machine has gone to the village elders! WITCHCRAFT!",
    "[gasps] Three seconds left, and a supernatural rabbit! I need a priest!",
  ],
  juju_goal: [
    "[screaming] IT'S IN! Another one! They cannot MISS!",
    "[shouting] And ANOTHER! This isn't football, it's a SEANCE!",
    "[sobbing] Why do they keep going in?!",
    "[screaming] Unstoppable! It's spiritual!",
  ],
  last10: [
    "[shouting] Ten seconds left! Every nerve is on fire!",
    "[gasps] I can't watch! I can't NOT watch!",
    "[excited] The clock is ticking! ANYTHING could happen!",
  ],
  golden: [
    "[shouting] Level at full time! Golden goal! I've gone cold!",
    "[gasps] Sudden death! I need to sit down!",
    "[screaming] Golden goal! The pure, unfiltered DRAMA!",
  ],
  win: [
    "[shouting] A famous victory! They'll talk about this for a generation!",
    "[screaming] FULL TIME! You've won it! I'm openly WEEPING!",
    "[gasps] It's over! And you won it! I don't know where to look!",
    "[shouting] Magnificent! And they said it couldn't be done!",
  ],
  win_big: [
    "[laughs] That wasn't a match, it was a public execution!",
    "[screaming] A complete rout! Someone hug the poor CPU!",
    "[shouting] Demolished! I need a dark room!",
  ],
  loss: [
    "[sobbing] It's over. We've lost to a computer. My career is finished.",
    "[crying] Full time. The machine goes home happy. I can't talk about it.",
    "[gasps] They've beaten us! I'll never forgive myself!",
    "[sighs] Well. That's that. Cruel, cruel game.",
  ],
  draw: [
    "[sighs] A draw. I've aged ten years for nothing.",
    "[gasps] All square! I feel like I've been through a war!",
    "[shouting] A thrilling, pointless, magnificent draw!",
  ],
  juju_loss: [
    "[screaming] THEY'VE WON IT! BY WITCHCRAFT! I'm writing to the FA!",
    "[sobbing] ROBBED! By the supernatural! There's no defence against that!",
    "[crying] It was five-one! FIVE-ONE! This match was haunted!",
    "[gasps] I'm calling ALL of the authorities!",
  ],
};
