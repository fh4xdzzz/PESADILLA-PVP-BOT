import { SlashCommandBuilder } from 'discord.js';

export const commands = [
  new SlashCommandBuilder()
    .setName('power')
    .setDescription('Controla el estado del servidor (SparkedHost)')
    .addStringOption((o) =>
      o.setName('action').setDescription('Acción de power').setRequired(true)
        .addChoices(
          { name: 'Iniciar', value: 'start' },
          { name: 'Detener', value: 'stop' },
          { name: 'Reiniciar', value: 'restart' },
          { name: 'Forzar apagado (kill)', value: 'kill' },
        ))
    .toJSON(),

  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Muestra CPU, RAM, disco, red y estado del servidor')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('console')
    .setDescription('Interactúa con la consola del servidor')
    .addSubcommand((s) =>
      s.setName('send').setDescription('Envía un comando al servidor')
        .addStringOption((o) => o.setName('command').setDescription('Comando a enviar').setRequired(true)))
    .addSubcommand((s) =>
      s.setName('logs').setDescription('Lee las últimas líneas de la consola')
        .addIntegerOption((o) => o.setName('lines').setDescription('Cantidad de líneas (máx 100)').setMinValue(1).setMaxValue(100)))
    .toJSON(),

  new SlashCommandBuilder()
    .setName('file')
    .setDescription('Gestiona archivos del servidor')
    .addSubcommand((s) =>
      s.setName('read').setDescription('Lee un archivo')
        .addStringOption((o) => o.setName('path').setDescription('Ruta del archivo (ej. server.properties)').setRequired(true)))
    .addSubcommand((s) =>
      s.setName('write').setDescription('Escribe/crea un archivo')
        .addStringOption((o) => o.setName('path').setDescription('Ruta del archivo').setRequired(true))
        .addStringOption((o) => o.setName('content').setDescription('Contenido completo del archivo').setRequired(true)))
    .addSubcommand((s) =>
      s.setName('list').setDescription('Lista el contenido de un directorio')
        .addStringOption((o) => o.setName('directory').setDescription('Directorio (default: /)').setRequired(false)))
    .toJSON(),

  new SlashCommandBuilder()
    .setName('datastore')
    .setDescription('Data Stores de Roblox (Open Cloud)')
    .addSubcommand((s) =>
      s.setName('get').setDescription('Lee una entrada')
        .addStringOption((o) => o.setName('datastore').setDescription('Nombre del DataStore').setRequired(true))
        .addStringOption((o) => o.setName('key').setDescription('Key de la entrada').setRequired(true)))
    .addSubcommand((s) =>
      s.setName('set').setDescription('Escribe una entrada')
        .addStringOption((o) => o.setName('datastore').setDescription('Nombre del DataStore').setRequired(true))
        .addStringOption((o) => o.setName('key').setDescription('Key de la entrada').setRequired(true))
        .addStringOption((o) => o.setName('value').setDescription('Valor a guardar').setRequired(true)))
    .addSubcommand((s) =>
      s.setName('list').setDescription('Lista los DataStores de la universe'))
    .toJSON(),
];
