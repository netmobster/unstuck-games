"""The dozens, in the form the generator can roll on.

Written from BUILDER-TABLES.md. Each entry is (name, what it means, what it changes) —
the third field is what goes to the model, because a table that only names things produces
a campaign that only names things.
"""
from __future__ import annotations

TROPES = [
    ("Taken in", "a street rat, saved by somebody who did not have to", "a mentor gone or going; the world that made them"),
    ("The reluctant heir", "it is theirs and they did not want it", "a succession; someone else with a claim"),
    ("Last of the order", "everyone who taught them is dead", "a reckoning; a fallen member still alive"),
    ("The apprentice outgrows", "they are better than their teacher now", "a rival who taught them"),
    ("The debt comes due", "terms they did not finish reading", "a creditor with a schedule"),
    ("Revenge, and the cost", "they will get them; that is not the question", "a schemer; a belief that turns out false"),
    ("Fish out of water", "nothing here works the way it did at home", "hostile authority; social trouble"),
    ("The prophecy, misread", "chosen for something — not that thing", "a zealot who read it differently"),
    ("Unfinished business", "somebody left something half-done and it is still moving", "a spread or an arrival"),
    ("Found family", "they collected these people and cannot spend them", "companions outweigh the trouble"),
    ("Home, and what is left", "they went back; it did not wait", "a place they know, changed"),
    ("The impostor becomes real", "pretending until it mattered", "a heist; somebody who believes in them"),
]

ORIGINS = [
    ("Accident", "in the wrong place when something went wrong", "a true fact nobody else knows"),
    ("Legacy", "it was their mother's", "an item with provenance, and a claim on it"),
    ("Chosen", "something picked them and did not ask", "a patron who wants something back"),
    ("Trained", "ten years, nobody gave them anything", "no debts, no patron, higher skill"),
    ("Made", "built, bred or brought back for a purpose", "a maker, and a false belief about themselves"),
    ("Bloodline", "it was in them before they knew", "a relative on the board; a suspected secret"),
    ("Bargain", "terms they have not finished reading", "a creditor with a hard schedule"),
    ("Sole survivor", "everyone else who was there is dead", "a place they cannot go back to; someone who blames them"),
    ("Exile", "not allowed home, and the reason is on paper", "authority starts hostile"),
    ("Debt", "someone paid for them and is patient", "a front that would rather use them"),
    ("Mistake", "the trouble is partly their fault", "the opening front's origin is their own secret"),
    ("Returned", "came back from where people do not", "a gap in their memory; one false fact"),
]

WORLDS = [
    ("The vale with a magic police", "every spell is a licensing question"),
    ("Free port", "everything is for sale, including the law"),
    ("The frontier road", "help is three days away, always"),
    ("Guild city", "doing anything is somebody's monopoly"),
    ("Monastery-state", "the rules are holy and enforced by believers"),
    ("Drowned coast", "the sea took half of it and is coming back"),
    ("The warren", "people live under, and what is under them is older"),
    ("Ash plain, post-war", "everyone present did something in the war"),
    ("Pilgrim country", "the road is full of strangers with a reason"),
    ("The archive city", "the truth is filed somewhere, and filing is power"),
    ("The cold march", "weather is a front and does not negotiate"),
    ("Orchard counties", "quiet, rich, and everyone is related"),
]

TROUBLES = [
    ("A theft", "something is gone and the hole is the wrong shape"),
    ("A disappearance", "a person, and nobody agrees when"),
    ("An arrival", "something came, and it is still here"),
    ("A debt", "they owe, or somebody owes for them"),
    ("An escort", "get them there; they will not help"),
    ("A siege", "it is coming here, and here is where they live"),
    ("A death", "somebody did it and is still in the room"),
    ("A heist", "it is inside, behind people good at their jobs"),
    ("A delve", "the way down is open again"),
    ("A spread", "it is getting worse and it is not a person"),
    ("A succession", "the old one is dying and everyone has a candidate"),
    ("A reckoning", "something from before has come to settle"),
]

POSTURES = [
    ("Tyrant", "this is mine and you are in it", "public, official, uses law before force"),
    ("Zealot", "you would agree if you understood", "cannot be bribed; can be argued with once"),
    ("Schemer", "you meet the plan before the person", "appears as consequences first"),
    ("Rival", "I was doing this first", "matches the party's methods"),
    ("Collector", "you are interesting; I would like to keep you", "captures rather than kills"),
    ("Bureaucrat", "your paperwork is not in order", "obstruction; wins by delay"),
    ("Fallen hero", "I did what you are doing", "uses the party's own record against them"),
    ("Parent", "I am protecting mine", "sympathetic, and will not stop"),
    ("Merchant", "everything is negotiable, including this", "every scene has a price"),
    ("Believer in you", "you will come round; I can wait", "never fights at full strength"),
    ("Survivor", "you do not know what it cost to be here", "takes no risks, escapes early"),
    ("Sentimentalist", "it did not have to be like this", "keeps a token from every fight"),
]

AXES = ["destroyed", "stopped", "used", "replaced"]

COMPANIONS = [
    ("Korth", "goes first, silently", "never explains, so nobody plans"),
    ("Grumble", "talks to everything", "cannot keep a secret for one scene"),
    ("Ossa", "counts and remembers", "says the true number to the wrong person"),
    ("The quartermaster", "has one of everything", "wants it back, itemised"),
    ("The novice", "volunteers", "is not ready and knows it"),
    ("The retired one", "sees it coming", "will not draw a weapon"),
    ("The heir", "opens doors by existing", "is recognised everywhere"),
    ("The dog", "knows", "cannot tell you"),
    ("The fence", "prices anything", "will sell your location, and says so"),
    ("The pilgrim", "walks through anything", "stops to do the right thing at the worst moment"),
    ("The scribe", "writes it down", "the record is evidence"),
    ("The debtor", "pays their way", "someone is following them"),
]

PERSONAS = [
    ("The Registrar", "a clerk reading out a form", "short sentences, nouns, no adverbs"),
    ("The Chronicler", "somebody writing it down after", "past tense, the long view"),
    ("The Publican", "the person behind the bar who saw it", "gossip first, geography second"),
    ("The Coroner", "cause, then effect, then the body", "clinical, unflinching"),
    ("The Fabulist", "a tall story that happens to be true", "exaggeration, then a flat correction"),
    ("The Preacher", "a sermon with the party in it", "cadence, repetition, second person"),
    ("The Archivist", "with footnotes nobody asked for", "cross-references its own facts"),
    ("The Gambler", "in odds and tells", "names the stake before the scene"),
    ("The Quartermaster", "in inventory", "counts and values everything"),
    ("The Child", "plainly, missing the point beautifully", "short, literal, unafraid"),
    ("The Machine", "procedurally, and it is unsettling", "numbered observations, no affect"),
    ("The Old Soldier", "like somebody who has seen this before", "understatement, practical detail"),
]

DIALS = {
    "absurdity": ["grim", "dry", "wry", "absurd"],
    "stakes": ["personal", "local", "regional", "epic"],
    "danger": ["bruises", "wounds", "losses", "deaths"],
    "focus": ["people", "mostly people", "mostly places", "places"],
    "length": ["one session", "a short arc", "a season"],
}
