// --- FILE: src/storage.js ---
const schema = {
    username: {
      type: 'string',
      default: '',
    },
    modsURL: {
      type: 'string',
      default: '',
    },
    minecraftURL: {
      type: 'string',
      default: '',
    },
    minMemory: {
      type: 'string',
      default: '2G',
    },
    maxMemory: {
      type: 'string',
      default: '4G',
    },
    theme: {
      type: 'string',
      default: 'default',
    },
    primaryColor: {
      type: 'string',
      default: '#ff6b8b', // Color primario por defecto (rosa)
    },
    primaryHoverColor: {
      type: 'string',
      default: '#ff4d73', // Color primario hover por defecto
    },
    secondaryColor: {
      type: 'string',
      default: '#ff8fa3', // Color secundario por defecto (rosa)
    },
    secondaryHoverColor: {
      type: 'string',
      default: '#ff7a91', // Color secundario hover por defecto
    },
    windowState: {
      // Add window state
      type: 'object',
      properties: {
        width: { type: 'number' },
        height: { type: 'number' },
        x: { type: 'number' },
        y: { type: 'number' },
      },
      default: {}, // Important: Start with an empty object
    },
  };
  
  // Use a dynamic import() to load electron-store.  This returns a Promise.
  async function getStore() {
    const { default: Store } = await import('electron-store'); // Correct import
    return new Store({ schema });
  }
  
  async function getSettings() {
    const store = await getStore(); // Await the store instance.
    return {
      username: store.get('username'),
      modsURL: store.get('modsURL'),
      minecraftURL: store.get('minecraftURL'),
      minMemory: store.get('minMemory'),
      maxMemory: store.get('maxMemory'),
      theme: store.get('theme'),
      primaryColor: store.get('primaryColor'),
      primaryHoverColor: store.get('primaryHoverColor'),
      secondaryColor: store.get('secondaryColor'),
      secondaryHoverColor: store.get('secondaryHoverColor'),
    };
  }
  
  async function setSettings(settings) {
    const store = await getStore(); // Await the store instance.
    if (settings.username !== undefined) {
      store.set('username', settings.username);
    }
    if (settings.modsURL !== undefined) {
      store.set('modsURL', settings.modsURL);
    }
    if (settings.minecraftURL !== undefined) {
      store.set('minecraftURL', settings.minecraftURL);
    }
    if (settings.minMemory !== undefined) {
      store.set('minMemory', settings.minMemory);
    }
    if (settings.maxMemory !== undefined) {
      store.set('maxMemory', settings.maxMemory);
    }
    if (settings.theme !== undefined) {
      store.set('theme', settings.theme);
    }
    if (settings.primaryColor !== undefined) {
      store.set('primaryColor', settings.primaryColor);
    }
    if (settings.primaryHoverColor !== undefined) {
      store.set('primaryHoverColor', settings.primaryHoverColor);
    }
    if (settings.secondaryColor !== undefined) {
      store.set('secondaryColor', settings.secondaryColor);
    }
    if (settings.secondaryHoverColor !== undefined) {
      store.set('secondaryHoverColor', settings.secondaryHoverColor);
    }
  }
  
  async function getWindowState() {
    const store = await getStore();
    return store.get('windowState');
  }
  
  async function setWindowState(state) {
    const store = await getStore();
    store.set('windowState', state);
  }
  
  module.exports = {
    getSettings,
    setSettings,
    getWindowState,
    setWindowState,
  };