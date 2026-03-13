declare module 'anki-apkg-export' {
  export default class AnkiExport {
    constructor(deckName: string);
    addCard(front: string, back: string, options?: { tags?: string[] }): void;
    save(): Promise<Uint8Array>;
  }
}
