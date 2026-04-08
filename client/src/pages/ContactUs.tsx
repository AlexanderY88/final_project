import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../app/hooks';
import { sendContactMessage } from '../services/messages';
import { toast } from 'react-toastify';
import { contactUsSchema, getFieldErrorWithJoi, validateWithJoi } from '../utils/validation';

const SUBJECTS = [
  { value: 'general', label: 'General Inquiry' },
  { value: 'support', label: 'Technical Support' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'other', label: 'Other' },
];

const ContactInfo: React.FC = () => {
  const supportEmail = 'support@stockmanager.co.il';
  const supportPhoneDisplay = '+972-52-7111111';
  const supportPhoneHref = 'tel:+972527111111';
  const supportAddress = 'Herzl St 24, Tel Aviv, Israel';
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(supportAddress)}`;

  return (
  <div className="space-y-6">
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-start space-x-4">
        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Email</h3>
          <a
            href={`mailto:${supportEmail}`}
            className="text-gray-600 hover:text-indigo-600 hover:underline transition"
          >
            {supportEmail}
          </a>
        </div>
      </div>
    </div>

    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-start space-x-4">
        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Phone</h3>
          <a
            href={supportPhoneHref}
            className="text-gray-600 hover:text-indigo-600 hover:underline transition"
          >
            {supportPhoneDisplay}
          </a>
        </div>
      </div>
    </div>

    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-start space-x-4">
        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Address</h3>
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 hover:text-indigo-600 hover:underline transition"
          >
            {supportAddress}
          </a>
        </div>
      </div>
    </div>
  </div>
  );
};

const ContactUs: React.FC = () => {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const [formData, setFormData] = useState({
    name: user ? `${user.name.first} ${user.name.last}` : '',
    email: user?.email || '',
    subject: '',
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submittedMessageNumber, setSubmittedMessageNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    setFormData((prev) => ({
      ...prev,
      name: `${user.name.first} ${user.name.last}`.trim(),
      email: user.email || '',
    }));
  }, [user]);

  const isFormValid = Object.keys(validateWithJoi(contactUsSchema, formData)).length === 0;

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    const nextFormData = { ...formData, [name]: value };
    setFormData(nextFormData);

    const fieldError = getFieldErrorWithJoi(contactUsSchema, nextFormData, name);
    setErrors((prev) => ({ ...prev, [name]: fieldError }));
  };

  const validate = (): boolean => {
    const nextErrors = validateWithJoi(contactUsSchema, formData);
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      const response = await sendContactMessage({
        name: String(formData.name).trim(),
        email: String(formData.email).trim().toLowerCase(),
        subject: String(formData.subject).trim(),
        message: String(formData.message).trim(),
      });
      setSubmittedMessageNumber(response.data.messageNumber);
      setSubmitted(true);
      toast.success(`Your message has been sent. ID #${response.data.messageNumber}`);
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to send message. Please try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setSubmittedMessageNumber(null);
    setErrors({});
    setFormData({
      name: user ? `${user.name.first} ${user.name.last}` : '',
      email: user?.email || '',
      subject: '',
      message: '',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Contact Us</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Have a question or feedback? We&apos;d love to hear from you.
          </p>
        </div>

        <div className={`grid ${isAuthenticated ? 'md:grid-cols-2' : ''} gap-8`}>
          <ContactInfo />

          {isAuthenticated ? (
            <div className="bg-white rounded-xl shadow-lg p-8">
              {submitted ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Message Sent!</h3>
                  <p className="text-gray-600">Thank you for reaching out. We&apos;ll get back to you soon.</p>
                  {submittedMessageNumber !== null && (
                    <p className="mt-2 text-sm font-semibold text-indigo-700">Message ID: #{submittedMessageNumber}</p>
                  )}
                  <button
                    onClick={handleReset}
                    className="mt-4 text-indigo-600 hover:text-indigo-500 font-medium transition duration-200"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      disabled
                      maxLength={100}
                      className={`w-full px-4 py-3 border rounded-lg transition duration-200 ${errors.name ? 'border-red-400 bg-red-50' : 'border-gray-300'} disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed`}
                      placeholder="Name from your account"
                    />
                    {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      disabled
                      maxLength={200}
                      className={`w-full px-4 py-3 border rounded-lg transition duration-200 ${errors.email ? 'border-red-400 bg-red-50' : 'border-gray-300'} disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed`}
                      placeholder="Email from your account"
                    />
                    {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                      Subject
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-200 ${errors.subject ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                    >
                      <option value="">Select a subject</option>
                      {SUBJECTS.map((subject) => (
                        <option key={subject.value} value={subject.value}>
                          {subject.label}
                        </option>
                      ))}
                    </select>
                    {errors.subject && <p className="mt-1 text-sm text-red-600">{errors.subject}</p>}
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      rows={4}
                      maxLength={2000}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-200 resize-none ${errors.message ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                      placeholder="Your message... (letters, digits, spaces, . , ? ! only)"
                    />
                    {errors.message && <p className="mt-1 text-sm text-red-600">{errors.message}</p>}
                    <p className="mt-1 text-xs text-gray-400">Allowed: letters, digits, spaces, and . , ? !</p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !isFormValid}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transform hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed"
                  >
                    {loading ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg p-8 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Sign in to Send a Message</h3>
              <p className="text-gray-600 mb-4">Please log in to use the contact form.</p>
              <Link
                to="/login"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
              >
                Log In
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
