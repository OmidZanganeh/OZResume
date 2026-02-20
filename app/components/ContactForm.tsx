'use client';
import { useState } from 'react';
import styles from './ContactForm.module.css';

export default function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('sending');
    const form = e.currentTarget;
    const data = new FormData(form);
    try {
      const res = await fetch('https://formspree.io/f/YOUR_FORM_ID', {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        setStatus('sent');
        form.reset();
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Send Me a Message</h2>
      <p className={styles.subtitle}>Open to opportunities, collaborations, and interesting conversations.</p>

      {status === 'sent' ? (
        <div className={styles.success}>
          ✓ Message sent! I&apos;ll get back to you soon.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Name</label>
              <input name="name" required className={styles.input} placeholder="Your name" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Email</label>
              <input name="email" type="email" required className={styles.input} placeholder="your@email.com" />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Message</label>
            <textarea name="message" required className={styles.textarea} rows={5} placeholder="What's on your mind?" />
          </div>
          <button type="submit" className={styles.btn} disabled={status === 'sending'}>
            {status === 'sending' ? '[ sending... ]' : '[ Send Message ]'}
          </button>
          {status === 'error' && (
            <p className={styles.error}>Something went wrong. Email me directly at ozanganeh@unomaha.edu</p>
          )}
        </form>
      )}
    </section>
  );
}
