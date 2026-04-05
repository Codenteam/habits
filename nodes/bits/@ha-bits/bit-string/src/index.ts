/**
 * @ha-bits/bit-string
 * 
 * Simple string manipulation bit - programmatic style
 */

// Simple bit structure - no external dependencies needed
const stringBit = {
  displayName: 'String Utils',
  description: 'Simple string manipulation utilities',
  logoUrl: 'lucide:CaseSensitive',
  runtime: 'all',
  
  // Actions as a record
  actions: {
    uppercase: {
      name: 'uppercase',
      displayName: 'Upper Case',
      description: 'Convert text to UPPER CASE',
      props: {
        text: {
          type: 'SHORT_TEXT',
          displayName: 'Text',
          description: 'The text to convert to upper case',
          required: true,
        },
      },
      async run(context: { propsValue: { text: string } }) {
        const { text } = context.propsValue;
        const result = String(text).toUpperCase();
        console.log(`📝 String uppercase: "${text}" → "${result}"`);
        return { 
          original: text,
          result: result 
        };
      },
    },
  },
  
  // Empty triggers
  triggers: {},
};

// Export the bit
export const stringUtils = stringBit;
export default stringBit;
