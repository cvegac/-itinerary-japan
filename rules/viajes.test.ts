import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { startRules } from "./setup";

// Viaje compartido de la app de viajes: quien lo crea invita a UNA persona con
// el link (el id del viaje es el secreto) y los dos dejan notas por día o lugar
let env: RulesTestEnvironment;
beforeAll(async () => {
  env = await startRules();
});
afterAll(() => env.cleanup());
beforeEach(() => env.clearFirestore());

const as = (uid: string) => env.authenticatedContext(uid).firestore();

const newTrip = (uid: string, extra: object = {}) => ({
  slug: "japan",
  members: [uid],
  names: { [uid]: "Cris" },
  createdAt: serverTimestamp(),
  ...extra,
});

async function trip(): Promise<string> {
  return (await addDoc(collection(as("cris"), "viajes"), newTrip("cris"))).id;
}

async function sharedTrip(): Promise<string> {
  const id = await trip();
  await updateDoc(doc(as("ana"), "viajes", id), { members: arrayUnion("ana"), "names.ana": "Ana" });
  return id;
}

const note = (author: string, extra: object = {}) => ({
  day: "2026-11-03",
  text: "En Ameyoko hay puestos de ropa más baratos",
  author,
  createdAt: serverTimestamp(),
  ...extra,
});

describe("users/{uid}", () => {
  it("cada uno lee y escribe solo lo suyo", async () => {
    await assertSucceeds(setDoc(doc(as("ana"), "users/ana/trips/japan"), { done: ["a"] }));
    await assertSucceeds(getDoc(doc(as("ana"), "users/ana/trips/japan")));
    await assertFails(getDoc(doc(as("beto"), "users/ana/trips/japan")));
    await assertFails(setDoc(doc(as("beto"), "users/ana/trips/japan"), { done: [] }));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "users/ana/trips/japan")));
  });
});

describe("viajes/{tripId}", () => {
  it("se crea con uno solo: quien lo crea", async () => {
    await assertSucceeds(addDoc(collection(as("cris"), "viajes"), newTrip("cris")));
    await assertFails(addDoc(collection(as("cris"), "viajes"), { ...newTrip("cris"), members: ["cris", "ana"] }));
    await assertFails(addDoc(collection(as("cris"), "viajes"), newTrip("ana")));
    await assertFails(addDoc(collection(env.unauthenticatedContext().firestore(), "viajes"), newTrip("cris")));
  });

  it("no se crea con campos de más ni un viaje sin nombre válido", async () => {
    await assertFails(addDoc(collection(as("cris"), "viajes"), newTrip("cris", { admin: true })));
    await assertFails(addDoc(collection(as("cris"), "viajes"), newTrip("cris", { slug: "Japón con espacios" })));
    await assertFails(addDoc(collection(as("cris"), "viajes"), newTrip("cris", { names: { cris: "" } })));
  });

  it("con el link se suma UNA persona y después queda cerrado", async () => {
    const id = await trip();
    await assertSucceeds(updateDoc(doc(as("ana"), "viajes", id), { members: arrayUnion("ana"), "names.ana": "Ana" }));
    await assertFails(updateDoc(doc(as("caro"), "viajes", id), { members: arrayUnion("caro"), "names.caro": "Caro" }));
  });

  it("quien se suma no puede cambiar el viaje ni el nombre del otro", async () => {
    const id = await trip();
    await assertFails(
      updateDoc(doc(as("ana"), "viajes", id), { members: arrayUnion("ana"), "names.ana": "Ana", slug: "otro" })
    );
    await assertFails(updateDoc(doc(as("ana"), "viajes", id), { members: arrayUnion("ana"), "names.cris": "X" }));
    await assertFails(updateDoc(doc(as("ana"), "viajes", id), { members: ["ana"], "names.ana": "Ana" }));
  });

  it("solo los miembros lo ven, también al buscar mis viajes", async () => {
    const id = await sharedTrip();
    await assertSucceeds(getDoc(doc(as("ana"), "viajes", id)));
    await assertFails(getDoc(doc(as("caro"), "viajes", id)));
    await assertSucceeds(
      getDocs(query(collection(as("ana"), "viajes"), where("members", "array-contains", "ana"), where("slug", "==", "japan")))
    );
    await assertFails(getDocs(query(collection(as("caro"), "viajes"), where("slug", "==", "japan"))));
  });

  it("cada uno cambia su propio nombre, y nadie lo borra", async () => {
    const id = await sharedTrip();
    await assertSucceeds(updateDoc(doc(as("ana"), "viajes", id), { "names.ana": "Anita" }));
    await assertFails(updateDoc(doc(as("ana"), "viajes", id), { "names.cris": "X" }));
    await assertFails(deleteDoc(doc(as("ana"), "viajes", id)));
  });
});

describe("viajes/{tripId}/notas", () => {
  it("los dos leen y dejan notas con su nombre", async () => {
    const id = await sharedTrip();
    await assertSucceeds(addDoc(collection(as("ana"), "viajes", id, "notas"), note("ana")));
    await assertSucceeds(addDoc(collection(as("cris"), "viajes", id, "notas"), note("cris", { place: "Ameyoko" })));
    await assertSucceeds(getDocs(collection(as("cris"), "viajes", id, "notas")));
  });

  it("alguien de afuera no lee ni escribe", async () => {
    const id = await sharedTrip();
    await addDoc(collection(as("ana"), "viajes", id, "notas"), note("ana"));
    await assertFails(getDocs(collection(as("caro"), "viajes", id, "notas")));
    await assertFails(addDoc(collection(as("caro"), "viajes", id, "notas"), note("caro")));
    await assertFails(getDocs(collection(env.unauthenticatedContext().firestore(), "viajes", id, "notas")));
  });

  it("no se firma por el otro ni se inventa la fecha", async () => {
    const id = await sharedTrip();
    await assertFails(addDoc(collection(as("ana"), "viajes", id, "notas"), note("cris")));
    await assertFails(addDoc(collection(as("ana"), "viajes", id, "notas"), note("ana", { createdAt: new Date(2020, 0, 1) })));
  });

  it("la nota tiene un día, un texto corto y nada más", async () => {
    const id = await sharedTrip();
    const notes = collection(as("ana"), "viajes", id, "notas");
    await assertFails(addDoc(notes, note("ana", { day: "mañana" })));
    await assertFails(addDoc(notes, note("ana", { text: "" })));
    await assertFails(addDoc(notes, note("ana", { text: "x".repeat(1001) })));
    await assertFails(addDoc(notes, note("ana", { place: "x".repeat(101) })));
    await assertFails(addDoc(notes, note("ana", { extra: 1 })));
  });

  it("cada uno edita el texto de sus notas, no las del otro", async () => {
    const id = await sharedTrip();
    const ref = await addDoc(collection(as("ana"), "viajes", id, "notas"), note("ana"));
    await assertSucceeds(updateDoc(doc(as("ana"), ref.path), { text: "Mejor ir temprano", editedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(as("cris"), ref.path), { text: "Otra cosa", editedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(as("ana"), ref.path), { author: "cris", editedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(as("ana"), ref.path), { day: "2026-11-04", editedAt: serverTimestamp() }));
  });

  it("cualquiera de los dos borra una nota, alguien de afuera no", async () => {
    const id = await sharedTrip();
    const mine = await addDoc(collection(as("ana"), "viajes", id, "notas"), note("ana"));
    const theirs = await addDoc(collection(as("ana"), "viajes", id, "notas"), note("ana"));
    await assertFails(deleteDoc(doc(as("caro"), mine.path)));
    await assertSucceeds(deleteDoc(doc(as("ana"), mine.path)));
    await assertSucceeds(deleteDoc(doc(as("cris"), theirs.path)));
  });

  it("sin compartir todavía, quien lo creó ya puede dejar notas", async () => {
    const id = await trip();
    await assertSucceeds(addDoc(collection(as("cris"), "viajes", id, "notas"), note("cris")));
    await assertFails(addDoc(collection(as("ana"), "viajes", id, "notas"), note("ana")));
  });
});
