/**
 * @ha-bits/bit-hello-world
 * 
 * A simple hello world bit for demonstration and testing.
 * Returns "hello there" if param1="hello" and param2="world", otherwise "Nah!"
 * 
 * Demonstrates stub usage: Uses `to-constant-case` for text transformation.
 * In browser bundles, the stub appends "stub" instead of converting.
 */

import toConstantCase = require('to-constant-case');

interface HelloWorldContext {
  propsValue: {
    param1: string;
    param2: string;
  };
}

const helloWorldBit = {
  displayName: 'Hello World',
  description: 'A simple demonstration bit that greets the world',
  logoUrl: 'lucide:Hand',
  
  actions: {
    /**
     * Greet action - returns greeting based on input parameters
     */
    greet: {
      name: 'greet',
      displayName: 'Greet',
      description: 'Returns "hello there" if param1="hello" and param2="world", otherwise "Nah!"',
      props: {
        param1: {
          type: 'SHORT_TEXT',
          displayName: 'Parameter 1',
          description: 'First parameter (use "hello" for greeting)',
          required: true,
        },
        param2: {
          type: 'SHORT_TEXT',
          displayName: 'Parameter 2',
          description: 'Second parameter (use "world" for greeting)',
          required: true,
        },
      },
      async run(context: HelloWorldContext) {
        const { param1, param2 } = context.propsValue;
        const greeting = toConstantCase('hello there');
        
        if (param1 === 'hello' && param2 === 'world') {
          return greeting;
        }
        
        return 'Nah!';
      },
    },
  },

  // Empty triggers
  triggers: {},
};

export const helloWorld = helloWorldBit;
export default helloWorldBit;
