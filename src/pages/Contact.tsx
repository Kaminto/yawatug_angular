import React from 'react';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Facebook, 
  Twitter, 
  Linkedin, 
  Instagram,
  Smartphone
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

const contactFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

const Contact = () => {
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      subject: '',
      message: '',
    },
  });

  const onSubmit = async (data: ContactFormValues) => {
    try {
      // Here you would typically send the form data to your backend
      console.log('Contact form submitted:', data);
      toast.success('Thank you for your inquiry. We\'ll get back to you soon!');
      form.reset();
    } catch (error) {
      toast.error('Failed to send message. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="pt-20">
        {/* Hero Section */}
        <section className="pt-32 pb-20 charcoal-section relative overflow-hidden">
          <div className="mining-pattern absolute inset-0"></div>
          <div className="container mx-auto px-4 lg:px-8 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <Badge className="bg-primary/20 text-primary border-primary/30 mb-6">Contact Us</Badge>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 text-secondary-foreground">
                Get In
                <span className="block gold-text">Touch With Us</span>
              </h1>
              <p className="text-xl text-secondary-foreground/80 mb-8 max-w-3xl mx-auto leading-relaxed">
                Get in touch with our team for investment opportunities, partnerships, 
                or any questions about Yawatu Minerals & Mining Ltd.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Information & Form */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Contact Information */}
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-bold text-foreground mb-6">
                    Get In Touch
                  </h2>
                  <p className="text-muted-foreground mb-8">
                    Ready to explore investment opportunities in Uganda's gold mining sector? 
                    Our team is here to provide detailed information about our operations 
                    and investment options.
                  </p>
                </div>

                {/* Contact Details */}
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="bg-primary/10 p-3 rounded-lg">
                      <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Email</h3>
                      <p className="text-muted-foreground">info@yawatuminerals.com</p>
                      <p className="text-muted-foreground">investors@yawatuminerals.com</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="bg-primary/10 p-3 rounded-lg">
                      <Phone className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Phone</h3>
                      <p className="text-muted-foreground">+256 700 123 456</p>
                      <p className="text-muted-foreground">+256 777 987 654</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="bg-primary/10 p-3 rounded-lg">
                      <MapPin className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Office Location</h3>
                      <p className="text-muted-foreground">
                        Yawatu House, Plot 123<br />
                        Kampala Business District<br />
                        Kampala, Uganda
                      </p>
                    </div>
                  </div>
                </div>

                {/* Social Media */}
                <div>
                  <h3 className="font-semibold text-foreground mb-4">Follow Us</h3>
                  <div className="flex space-x-4">
                    <a 
                      href="#" 
                      className="bg-primary/10 hover:bg-primary/20 p-3 rounded-lg transition-colors"
                    >
                      <Facebook className="h-5 w-5 text-primary" />
                    </a>
                    <a 
                      href="#" 
                      className="bg-primary/10 hover:bg-primary/20 p-3 rounded-lg transition-colors"
                    >
                      <Twitter className="h-5 w-5 text-primary" />
                    </a>
                    <a 
                      href="#" 
                      className="bg-primary/10 hover:bg-primary/20 p-3 rounded-lg transition-colors"
                    >
                      <Linkedin className="h-5 w-5 text-primary" />
                    </a>
                    <a 
                      href="#" 
                      className="bg-primary/10 hover:bg-primary/20 p-3 rounded-lg transition-colors"
                    >
                      <Instagram className="h-5 w-5 text-primary" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Contact Form */}
              <div className="bg-card border rounded-lg p-8">
                <h3 className="text-2xl font-bold text-foreground mb-6">
                  Send Us a Message
                </h3>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Your full name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address *</FormLabel>
                            <FormControl>
                              <Input placeholder="your.email@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input placeholder="+256 xxx xxx xxx" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="subject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subject *</FormLabel>
                            <FormControl>
                              <Input placeholder="Investment inquiry" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message *</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Tell us about your investment interests or questions..."
                              className="min-h-[120px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={form.formState.isSubmitting}
                    >
                      {form.formState.isSubmitting ? 'Sending...' : 'Send Message'}
                    </Button>
                  </form>
                </Form>
              </div>
            </div>
          </div>
        </section>

        {/* App Reminder Section */}
        <section className="py-16 bg-primary/5">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Smartphone className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Manage Your Investment Portfolio
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Already an investor? Access your account dashboard to track your shares, 
                view performance reports, and manage your portfolio online.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild>
                  <a href="/login">Access Your Account</a>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <a href="/register">Create New Account</a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Contact;