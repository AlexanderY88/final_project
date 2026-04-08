import Joi from 'joi';

export type FormErrors = Record<string, string>;

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[.!_@#$%^&*-])[A-Za-z\d.!_@#$%^&*-]{6,}$/;
const ISRAELI_PHONE_REGEX = /^(?:0\d{8,9}|(?:\+972|972)\d{8,9})$/;
const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SAFE_TEXT_REGEX = /^[A-Za-z0-9 .,?!]+$/;
const SAFE_SEARCH_REGEX = /^[A-Za-z0-9 @._,-]*$/;

const requiredName = (label: string) =>
  Joi.string().trim().min(2).max(50).required().messages({
    'string.empty': `${label} is required.`,
    'string.min': `${label} must be at least 2 characters.`,
    'string.max': `${label} must be at most 50 characters.`,
  });

const requiredAddressText = (label: string) =>
  Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': `${label} is required.`,
    'string.min': `${label} must be at least 2 characters.`,
    'string.max': `${label} cannot exceed 100 characters.`,
  });

const optionalShortText = (label: string, max = 50) =>
  Joi.string().trim().allow('').max(max).messages({
    'string.max': `${label} cannot exceed ${max} characters.`,
  });

const positiveInteger = (label: string, allowZero = false) =>
  Joi.number().integer().min(allowZero ? 0 : 1).required().messages({
    'number.base': `${label} must be a number.`,
    'number.integer': `${label} must be a whole number.`,
    'number.min': `${label} must be ${allowZero ? '0 or more' : 'greater than 0'}.`,
    'any.required': `${label} is required.`,
  });

const requiredIsraeliPhone = () =>
  Joi.string().trim().required().pattern(ISRAELI_PHONE_REGEX).messages({
    'string.empty': 'Phone number is required.',
    'string.pattern.base': 'Phone must be in Israeli format and include at least 9 digits (example: 0501234567 or 972501234567).',
  });

const optionalZipCode = () =>
  Joi.alternatives()
    .try(
      Joi.string().trim().pattern(/^\d{5,9}$/),
      Joi.number().integer().custom((value, helpers) => {
        const len = String(Math.abs(value)).length;
        if (len < 5 || len > 9) {
          return helpers.error('number.zipDigits');
        }
        return value;
      })
    )
    .allow('')
    .optional()
    .messages({
      'string.pattern.base': 'ZIP code must contain 5 to 9 digits.',
      'number.base': 'ZIP code must contain only numbers.',
      'number.integer': 'ZIP code must contain only numbers.',
      'number.zipDigits': 'ZIP code must contain 5 to 9 digits.',
    });

export const loginSchema = Joi.object({
  email: Joi.string().trim().email({ tlds: { allow: false } }).required().messages({
    'string.empty': 'Email is required.',
    'string.email': 'Email format is incorrect.',
  }),
  password: Joi.string().pattern(PASSWORD_REGEX).required().messages({
    'string.empty': 'Password is required.',
    'string.pattern.base': 'Password must include uppercase, lowercase, number, and special character.',
  }),
});

export const registerSchema = Joi.object({
  firstName: requiredName('Company name'),
  lastName: requiredName('Manager name'),
  email: Joi.string().trim().email({ tlds: { allow: false } }).required().messages({
    'string.empty': 'Email is required.',
    'string.email': 'Email format is incorrect.',
  }),
  password: Joi.string().pattern(PASSWORD_REGEX).required().messages({
    'string.empty': 'Password is required.',
    'string.pattern.base': 'Password must include uppercase, lowercase, number, and special character.',
  }),
  passwordConfirm: Joi.string().valid(Joi.ref('password')).required().messages({
    'string.empty': 'Password confirmation is required.',
    'any.only': 'Passwords do not match.',
  }),
  phone: requiredIsraeliPhone(),
  country: requiredAddressText('Country'),
  city: requiredAddressText('City'),
  street: requiredAddressText('Street'),
  houseNumber: positiveInteger('House number'),
  zip: optionalZipCode(),
  role: Joi.string().valid('user', 'main_brunch').required().messages({
    'any.only': 'Please select a valid account type.',
  }),
});

export const createUserSchema = Joi.object({
  firstName: requiredName('First name'),
  lastName: requiredName('Last name'),
  email: Joi.string().trim().email({ tlds: { allow: false } }).required().messages({
    'string.empty': 'Email is required.',
    'string.email': 'Email format is incorrect.',
  }),
  password: Joi.string().pattern(PASSWORD_REGEX).required().messages({
    'string.empty': 'Password is required.',
    'string.pattern.base': 'Password must include uppercase, lowercase, number, and special character.',
  }),
  confirmPassword: Joi.any().valid(Joi.ref('password')).required().messages({
    'any.only': 'Passwords do not match.',
    'any.required': 'Confirm password is required.',
  }),
  role: Joi.string().valid('admin', 'main_brunch', 'user').required().messages({
    'any.only': 'Please select a valid role.',
    'string.empty': 'Role is required.',
  }),
  phone: requiredIsraeliPhone(),
  country: requiredAddressText('Country'),
  city: requiredAddressText('City'),
  street: requiredAddressText('Street'),
  houseNumber: positiveInteger('House number'),
  zip: optionalZipCode(),
  mainBrunchId: Joi.string().allow('').when('role', {
    is: 'user',
    then: Joi.string().trim().required().messages({
      'string.empty': 'Main branch is required for child branch users.',
    }),
    otherwise: Joi.string().allow(''),
  }),
});

export const childBranchSchema = Joi.object({
  firstName: requiredName('Branch name'),
  lastName: requiredName('Manager'),
  email: Joi.string().trim().pattern(SIMPLE_EMAIL_REGEX).required().messages({
    'string.empty': 'Email is required.',
    'string.pattern.base': 'Email format is incorrect.',
  }),
  password: Joi.string().pattern(PASSWORD_REGEX).required().messages({
    'string.empty': 'Password is required.',
    'string.pattern.base': 'Password must include uppercase, lowercase, number, and special character.',
  }),
  phone: requiredIsraeliPhone(),
  country: requiredAddressText('Country'),
  city: requiredAddressText('City'),
  street: requiredAddressText('Street'),
  houseNumber: positiveInteger('House number'),
  zip: optionalZipCode(),
  mainBrunchId: Joi.string().allow('').optional(),
});

export const contactUsSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).pattern(SAFE_TEXT_REGEX).required().messages({
    'string.empty': 'Name is required.',
    'string.min': 'Name must be at least 2 characters.',
    'string.max': 'Name cannot exceed 100 characters.',
    'string.pattern.base': 'Name may only contain letters, digits, spaces, and . , ? !',
  }),
  email: Joi.string().trim().email({ tlds: { allow: false } }).required().messages({
    'string.empty': 'Email is required.',
    'string.email': 'Email format is incorrect.',
  }),
  subject: Joi.string().valid('general', 'support', 'feedback', 'other').required().messages({
    'any.only': 'Please select a valid subject.',
    'string.empty': 'Please select a subject.',
  }),
  message: Joi.string().trim().min(10).max(2000).pattern(SAFE_TEXT_REGEX).required().messages({
    'string.empty': 'Message is required.',
    'string.min': 'Message must be at least 10 characters.',
    'string.pattern.base': 'Message may only contain letters, digits, spaces, and . , ? !',
  }),
});

export const productFormSchema = Joi.object({
  title: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Title is required.',
    'string.min': 'Title must be at least 2 characters.',
    'string.max': 'Title cannot exceed 100 characters.',
  }),
  subtitle: Joi.string().trim().allow('').max(256).messages({
    'string.max': 'Subtitle cannot exceed 256 characters.',
  }),
  description: Joi.string().trim().min(10).max(516).required().messages({
    'string.empty': 'Description is required.',
    'string.min': 'Description must be at least 10 characters.',
    'string.max': 'Description cannot exceed 516 characters.',
  }),
  supplier: Joi.string().trim().min(1).max(50).required().messages({
    'string.empty': 'Supplier is required.',
    'string.min': 'Supplier must be at least 1 character.',
    'string.max': 'Supplier cannot exceed 50 characters.',
  }),
  category: Joi.string().trim().min(1).max(50).required().messages({
    'string.empty': 'Category is required.',
    'string.min': 'Category must be at least 1 character.',
    'string.max': 'Category cannot exceed 50 characters.',
  }),
  quantity: Joi.alternatives()
    .try(Joi.number().integer().min(0), Joi.string().trim().allow(''))
    .optional()
    .messages({
      'number.base': 'Quantity must be a number.',
      'number.integer': 'Quantity must be a whole number.',
      'number.min': 'Quantity must be 0 or more.',
    }),
  contextUserId: Joi.string().trim().allow('').optional(),
  imageType: Joi.string().valid('upload', 'url').required().messages({
    'any.only': 'Image type must be upload or url.',
    'string.empty': 'Image type is required.',
  }),
  imageUrl: Joi.when('imageType', {
    is: 'url',
    then: Joi.string().trim().uri().allow('').optional().messages({
      'string.uri': 'Please enter a valid image URL.',
    }),
    otherwise: Joi.string().allow(''),
  }),
  imageAlt: Joi.string().trim().allow('').max(100).messages({
    'string.max': 'Image description cannot exceed 100 characters.',
  }),
});

export const profileSchema = Joi.object({
  firstName: requiredName('First name'),
  lastName: requiredName('Last name'),
  middleName: optionalShortText('Middle name', 50),
  email: Joi.string().trim().email({ tlds: { allow: false } }).required().messages({
    'string.empty': 'Email is required.',
    'string.email': 'Email format is incorrect.',
  }),
  phone: requiredIsraeliPhone(),
  country: requiredAddressText('Country'),
  city: requiredAddressText('City'),
  street: requiredAddressText('Street'),
  houseNumber: positiveInteger('House number'),
  zip: optionalZipCode(),
  state: optionalShortText('State', 50),
});

export const mailboxCommentSchema = Joi.object({
  adminComment: Joi.string().trim().min(1).max(2000).pattern(SAFE_TEXT_REGEX).required().messages({
    'string.empty': 'Comment is required.',
    'string.pattern.base': 'Comment may only contain letters, digits, spaces, and . , ? !',
  }),
});

export const mailboxOptionalCommentSchema = Joi.object({
  adminComment: Joi.string().trim().allow('').max(2000).pattern(SAFE_TEXT_REGEX).messages({
    'string.pattern.base': 'Comment may only contain letters, digits, spaces, and . , ? !',
  }),
});

export const mailboxSearchSchema = Joi.object({
  search: Joi.string().trim().allow('').max(100).pattern(SAFE_SEARCH_REGEX).messages({
    'string.pattern.base': 'Search may only contain letters, digits, spaces, and @ . _ , -',
    'string.max': 'Search term is too long.',
  }),
});

export const validateWithJoi = <T>(schema: Joi.ObjectSchema<T>, value: T): FormErrors => {
  const { error } = schema.validate(value, { abortEarly: false });

  if (!error) {
    return {};
  }

  return error.details.reduce<FormErrors>((accumulator, detail) => {
    const field = String(detail.path[0] || 'form');
    if (!accumulator[field]) {
      accumulator[field] = detail.message;
    }
    return accumulator;
  }, {});
};

export const getFieldErrorWithJoi = <T>(schema: Joi.ObjectSchema<T>, value: T, fieldName: string): string => {
  const allErrors = validateWithJoi(schema, value);
  return allErrors[fieldName] || '';
};

export const getInputClassName = (hasError: boolean, baseClassName: string) =>
  `${baseClassName} ${hasError ? 'border-red-400 bg-red-50' : 'border-gray-300'}`;
