/**
 * Habit Validation System
 * 
 * Provides extensible validation for habits before running or packing.
 * Add new validators to the `habitValidators` array to extend validation logic.
 */

import type { CanvasNode, CanvasEdge } from '@ha-bits/core';

// Habit type - minimal interface needed for validation
export interface ValidatableHabit {
  id: string;
  name: string;
  description: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  output?: Record<string, string>;
}

export interface HabitValidationError {
  habitId: string;
  habitName: string;
  errorType: 'missing_nodes' | 'missing_name' | 'missing_output' | 'missing_input_params' | 'custom';
  message: string;
  severity: 'error' | 'warning';
}

// Validation function type for extensibility
export type HabitValidator = (habit: ValidatableHabit) => HabitValidationError | null;

// ===== UTILITY FUNCTIONS =====

// Check if a string is a UUID (v4)
export const isUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Check if a string is a valid slug (lowercase, alphanumeric, hyphens, no spaces)
export const isValidSlug = (str: string): boolean => {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(str);
};

// ===== INDIVIDUAL VALIDATORS =====


/**
 * Validator: Check if habit has a meaningful name
 * 
 * Warns if the habit name is missing or uses the default placeholder.
 */
export const validateHabitName: HabitValidator = (habit) => {
  if (!habit.name || habit.name.trim().length === 0) {
    return {
      habitId: habit.id,
      habitName: habit.name,
      errorType: 'missing_name',
      message: `Habit "${habit.name}" is missing a name.`,
      severity: 'error',
    };
  }
  
  if (habit.name.toLowerCase().includes('new habit') || habit.name.toLowerCase().includes('new workflow')) {
    return {
      habitId: habit.id,
      habitName: habit.name,
      errorType: 'missing_name',
      message: `Habit "${habit.name}" has a default name. Consider giving it a meaningful name.`,
      severity: 'error',
    };
  }

  if (isUUID(habit.id)) {
    return {
      habitId: habit.id,
      habitName: habit.name,
      errorType: 'missing_name',
      message: `Habit "${habit.name}" has a default name. Consider giving it a meaningful name.`,
      severity: 'error',
    };
  }
  
//   if (!isValidSlug(habit.id)) {
//     return {
//       habitId: habit.id,
//       habitName: habit.name,
//       errorType: 'invalid_id',
//       message: `Habit ID "${habit.id}" is not a valid slug. Use lowercase letters, numbers, and hyphens only.`,
//       severity: 'error',
//     };
//   }

  
  return null;
};

/**
 * Validator: Check if habit has nodes
 * 
 * Warns if the habit is empty (no workflow nodes configured).
 */
export const validateHabitNodes: HabitValidator = (habit) => {
  if (!habit.nodes || habit.nodes.length === 0) {
    return {
      habitId: habit.id,
      habitName: habit.name,
      errorType: 'missing_nodes',
      message: `Habit "${habit.name || habit.id}" has no nodes. Add at least one module.`,
      severity: 'warning',
    };
  }
  
  return null;
};

/**
 * Validator: Check if habit has output mappings
 * 
 * Warns if the habit doesn't define any output mappings.
 */
export const validateHabitOutputs: HabitValidator = (habit) => {
  if (!habit.output || Object.keys(habit.output).length === 0) {
    return {
      habitId: habit.id,
      habitName: habit.name,
      errorType: 'missing_output',
      message: `Habit "${habit.name || habit.id}" has no outputs defined. Consider adding output mappings.`,
      severity: 'warning',
    };
  }
  
  return null;
};

/**
 * Validator: Check if habit uses input parameters
 * 
 * Warns if the habit doesn't use any {{habits.input.*}} parameters.
 */
export const validateHabitInputUsage: HabitValidator = (habit) => {
  const inputParamRegex = /\{\{\s*habits\.input\.[^}]+\}\}/;
  
  // Check all nodes' params for input parameter usage
  const hasInputParam = habit.nodes.some(node => {
    const params = (node.data as any)?.params;
    if (!params) return false;
    
    // Recursively check all param values for the pattern
    const checkValue = (value: any): boolean => {
      if (typeof value === 'string') {
        return inputParamRegex.test(value);
      }
      if (Array.isArray(value)) {
        return value.some(checkValue);
      }
      if (value && typeof value === 'object') {
        return Object.values(value).some(checkValue);
      }
      return false;
    };
    
    return Object.values(params).some(checkValue);
  });
  
  if (!hasInputParam) {
    return {
      habitId: habit.id,
      habitName: habit.name,
      errorType: 'missing_input_params',
      message: `Habit "${habit.name || habit.id}" doesn't use any input parameters ({{habits.input.*}}). That might be intentional if it's automation or takes input from cookies or headers, consider adding input parameters otherwise.`,
      severity: 'warning',
    };
  }
  
  return null;
};

// ===== VALIDATION REGISTRY =====

/**
 * Master validation registry
 * 
 * Add new validators here to extend the validation system.
 * All validators are run against each habit.
 */
export const habitValidators: HabitValidator[] = [
  validateHabitName,
  validateHabitNodes,
  validateHabitOutputs,
  validateHabitInputUsage,
];

// ===== VALIDATION EXECUTOR =====

/**
 * Validate a single habit
 * 
 * Runs all validators against the habit and returns any errors found.
 */
export const validateHabit = (habit: ValidatableHabit): HabitValidationError[] => {
  const errors: HabitValidationError[] = [];
  
  for (const validator of habitValidators) {
    const error = validator(habit);
    if (error) {
      errors.push(error);
    }
  }
  
  return errors;
};

/**
 * Validate multiple habits
 * 
 * Runs all validators against each habit and returns all errors found.
 */
export const validateHabits = (habits: ValidatableHabit[]): HabitValidationError[] => {
  const errors: HabitValidationError[] = [];
  
  for (const habit of habits) {
    errors.push(...validateHabit(habit));
  }
  
  return errors;
};
