import * as z from "zod";

export const signUpSchema = z
  .object({
    email: z
      .string()
      .min(1, { message: "Email is required" })
      .email({ message: "Please enter a valid email address" }),
    password: z
      .string()
      .min(1, { message: "Password is required" })
      .min(8, { message: "Password must be at least 8 characters" }),
    passwordConfirmation: z
      .string()
      .min(1, { message: "Please confirm your password" }),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "Passwords do not match", // if false
    path: ["passwordConfirmation"], // the path of the error message '"Passwords do not match"' if it occurs is 'passwordConfirmation'
  });

  /*
  data refers to the object being validated by the schema.

In this context, data is an object with the properties: email, password, and passwordConfirmation.
When Zod validates an input against signUpSchema, it passes the entire input object as data to the .refine() function.
The function checks if data.password and data.passwordConfirmation are equal, ensuring the user typed the same password twice.
In summary:
data is the user’s submitted form data (the object being validated by the schema).*/