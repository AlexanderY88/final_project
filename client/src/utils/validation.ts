import Joi from 'joi';

export type FormErrors = Record<string, string>;

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[.!_@#$%^&*-])[A-Za-z\d.!_@#$%^&*-]{6,}$/;
const PHONE_REGEX = /^[0-9+()\-\s]{9,20}$/;
const SAFE_TEXT_REGEX = /^[A-Za-z0-9 .,?!]+$/;

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
    'string.max': `${label} is too long.`,
  });

const positiveInteger = (label: string, allowZero = false) =>
  Joi.number().integer().min(allowZero ? 0 : 1).required().messages({
    'number.base': `${label} must be a number.`,
    'number.integer': `${label} must be a whole number.`,
    'number.min': `${label} must be ${allowZero ? '0 or more' : 'greater than 0'}.`,
    'any.required': `${label} is required.`,
  });

export const loginSchema = Joi.object({
  email: Joi.string().trim().email({ tlds: { allow: false } }).required().messages({
    'string.empty': 'Email is required.',
    'string.email': 'Please enter a valid email address.',
  }),
  password: Joi.string().pattern(PASSWORD_REGEX).required().messages({
    'string.empty': 'Password is required.',
    'string.pattern.base': 'Password must include uppercase, lowercase, number, and special character.',
  }),
});

export const registerSchema = Joi.object({
  firstName: requiredName('First name'),
  lastName: requiredName('Last name'),
  email: Joi.string().trim().email({ tlds: { allow: false } }).required().messages({
    'string.empty': 'Email is required.',
    'string.email': 'Please enter a valid email address.',
  }),
  password: Joi.string().pattern(PASSWORD_REGEX).required().messages({
    'string.empty': 'Password is required.',
    'string.pattern.base': 'Password must include uppercase, lowercase, number, and special character.',
  }),
  role: Joi.string().valid('user', 'main_brunch').required().messages({
    'any.only': 'Please select a valid account type.',
  }),
});

export const createUserSchema = Joi.object({
  firstName: requiredName('First name'),
  lastName: requiredName('Last name'),
  email: Joi.string().trim().email({ tlds: { allow: false } }).required().messages({
    'string.empty': 'Email is required.',
    'string.email': 'Please enter a valid email address.',
  }),
  password: Joi.string().pattern(PASSWORD_REGEX).required().messages({
    'string.empty': 'Password is required.',
    'string.pattern.base': 'Password must include uppercase, lowercase, number, and special character.',
  }),
  confirmPassword: Joi.any().valid(Joi.ref('password')).required().messages({
    'any.only': 'Passwords do not match.',
    'any.required': 'Confirm password is required.',
  }),
  role: Joi.string().valid('admin', 'main_brunch', 'user').required(),
  phone: Joi.string().trim().pattern(PHONE_REGEX).required().messages({
    'string.empty': 'Phone number is required.',
    'string.pattern.base': 'Please enter a valid phone number.',
  }),
  country: requiredAddressText('Country'),
  city: requiredAddressText('City'),
  street: requiredAddressText('Street'),
  houseNumber: positiveInteger('House number'),
  zip: positiveInteger('ZIP code'),
  mainBrunchId: Joi.string().allow('').when('role', {
    is: 'user',
    then: Joi.string().trim().required().messages({
      'string.empty': 'Main branch is required for child branch users.',
    }),
    otherwise: Joi.string().allow(''),
  }),
});

export const childBranchSchema = Joi.object({
  firstName: requiredName('First name'),
  lastName: requiredName('Last name'),
  email: Joi.string().trim().email({ tlds: { allow: false } }).required().messages({
    'string.empty': 'Email is required.',
    'string.email': 'Please enter a valid email address.',
  }),
  password: Joi.string().pattern(PASSWORD_REGEX).required().messages({
    'string.empty': 'Password is required.',
    'string.pattern.base': 'Password must include uppercase, lowercase, number, and special character.',
  }),
  phone: Joi.string().trim().pattern(PHONE_REGEX).required().messages({
    'string.empty': 'Phone number is required.',
    'string.pattern.base': 'Please enter a valid phone number.',
  }),
  country: requiredAddressText('Country'),
  city: requiredAddressText('City'),
  street: requiredAddressText('Street'),
  houseNumber: positiveInteger('House number'),
  zip: positiveInteger('ZIP code'),
});

export const contactUsSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).pattern(SAFE_TEXT_REGEX).required().messages({
    'string.empty': 'Name is required.',
    'string.pattern.base': 'Name may only contain letters, digits, spaces, and . , ? !',
  }),
  email: Joi.string().trim().email({ tlds: { allow: false } }).required().messages({
    'string.empty': 'Email is required.',
    'string.email': 'Please enter a valid email address.',
  }),
  subject: Joi.string().valid('general', 'support', 'feedback', 'other').required().messages({
    'any.only': 'Please select a valid subject.',
    'string.empty': 'Please select a subject.',
  }),
  message: Joi.string().trim().min(5).max(2000).pattern(SAFE_TEXT_REGEX).required().messages({
    'string.empty': 'Message is required.',
    'string.min': 'Message must be at least 5 characters.',
    'string.pattern.base': 'Message may only contain letters, digits, spaces, and . , ? !',
  }),
});

export const productFormSchema = Joi.object({
  title: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Title is required.',
    'string.min': 'Title must be at least 2 characters.',
  }),
  subtitle: Joi.string().allow('').max(100).messages({
    'string.max': 'Subtitle is too long.',
  }),
  description: Joi.string().trim().min(10).max(2000).required().messages({
    'string.empty': 'Description is required.',
    'string.min': 'Description must be at least 10 characters.',
  }),
  supplier: requiredAddressText('Supplier'),
  category: requiredAddressText('Category'),
  quantity: positiveInteger('Quantity', true),
  state: Joi.string().allow('').max(50),
  country: requiredAddressText('Country'),
  city: requiredAddressText('City'),
  street: requiredAddressText('Street'),
  houseNumber: positiveInteger('House number'),
  zip: positiveInteger('ZIP code'),
  imageType: Joi.string().valid('upload', 'url').required(),
  imageUrl: Joi.when('imageType', {
    is: 'url',
    then: Joi.string().trim().uri().required().messages({
      'string.empty': 'Image URL is required when using image URL.',
      'string.uri': 'Please enter a valid image URL.',
    }),
    otherwise: Joi.string().allow(''),
  }),
  imageAlt: Joi.string().allow('').max(200).messages({
    'string.max': 'Image description is too long.',
  }),
});

export const profileSchema = Joi.object({
  firstName: requiredName('First name'),
  lastName: requiredName('Last name'),
  middleName: Joi.string().allow('').max(50),
  email: Joi.string().trim().email({ tlds: { allow: false } }).required().messages({
    'string.empty': 'Email is required.',
    'string.email': 'Please enter a valid email address.',
  }),
  phone: Joi.string().trim().pattern(PHONE_REGEX).required().messages({
    'string.empty': 'Phone number is required.',
    'string.pattern.base': 'Please enter a valid phone number.',
  }),
  country: requiredAddressText('Country'),
  city: requiredAddressText('City'),
  street: requiredAddressText('Street'),
  houseNumber: positiveInteger('House number'),
  zip: positiveInteger('ZIP code'),
  state: Joi.string().allow('').max(50),
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

export const getInputClassName = (hasError: boolean, baseClassName: string) =>
  `${baseClassName} ${hasError ? 'border-red-400 bg-red-50' : 'border-gray-300'}`;
