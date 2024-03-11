module.exports = [
  {
    script: 'dist/main.js',
    name: 'app',
    exec_mode: 'cluster',
    instances: 1,
  },
];
