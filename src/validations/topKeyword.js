import { z }from 'zod';

const analyzeSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().optional(),      // optional identifier to map back on the UI
      customerId: z.string().optional(),
      category: z.string().optional(),
      text: z.string().min(1, 'text is required')
    })
  ).min(1, 'items cannot be empty')
});

export default  analyzeSchema;
