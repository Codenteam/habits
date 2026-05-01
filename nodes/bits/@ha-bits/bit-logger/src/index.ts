/**
 * @ha-bits/bit-logger
 *
 * Minimal logging bit — calls console.log with whatever it receives.
 * Useful for debugging and testing trigger outputs.
 */

const loggerBit = {
  displayName: 'Logger',
  description: 'Logs input to console.log. Useful for debugging trigger outputs and workflow data.',
  logoUrl: 'lucide:Terminal',
  runtime: 'all',

  actions: {
    log: {
      name: 'log',
      displayName: 'Log',
      description: 'Logs the input value to console.log and returns it unchanged.',
      props: {
        message: { type: 'JSON', displayName: 'Message', required: false, defaultValue: '{}' },
        label: { type: 'SHORT_TEXT', displayName: 'Label', required: false, defaultValue: '' },
      },
      async run(context: any) {
        const { message, label } = context.propsValue;
        const prefix = label ? `[${label}]` : '[LOG]';
        console.log(prefix, JSON.stringify(message, null, 2));
        return { logged: true, message, label };
      },
    },
  },

  triggers: {},
};

export const bitLogger = loggerBit;
export default loggerBit;
