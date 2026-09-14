# Assessment 3 Evidence

## 1. Jobs Table (Successful and Failed Runs)
| Job ID | Status | File | Error Message |
|---|---|---|---|
| 016977af-3916-44af-8a7a-4dbbf1d5210e | failed | Eze, kate Ahurika CV.pdf | [GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent: [404 ] models/gemini-1.5-flash-latest is not found for API version v1beta, or is not supported for generateContent. Call ModelService.ListModels to see the list of available models and their supported methods. |
| a93a3931-3d68-4810-b228-b2245c12f7e6 | failed | blurred_note.png | Validation failed on AI output: Expected string, received number |
| 89dc9111-f559-4d41-823f-17e2a1d687ec | done | handwritten_note.jpg | N/A |
| 7261eb76-dfbe-4cd8-a026-09e4e058ba36 | failed | POP final sketch (1).png | [GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent: [404 ] models/gemini-1.5-flash is not found for API version v1beta, or is not supported for generateContent. Call ModelService.ListModels to see the list of available models and their supported methods. |
| 613559aa-62f8-4d59-bcf8-b1598a26a2ae | failed | POP final sketch (1).png | [GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent: fetch failed |
| 216804ae-14b8-442c-8494-d82e8061f0cf | failed | POP final sketch (1).png | [GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent: [404 ] models/gemini-1.5-flash is not found for API version v1beta, or is not supported for generateContent. Call ModelService.ListModels to see the list of available models and their supported methods. |
| 72b52aee-05f4-4bd4-80ca-a89a645a1721 | failed | c40b7427-1090-4b55-89f3-02c9d339e12a.jpeg | [GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent: [403 ] Method doesn't allow unregistered callers (callers without established identity). Please use API Key or other form of API consumer identity to call this API. |
| 0e830718-9274-4192-8319-b43004f3d0b1 | failed | test.jpg | Processing failed after 1 attempt(s): ENOENT: no such file or directory, open 'C:\Users\USER\Desktop\The AI Integration Slice\uploads\uploads\test.jpg' |
| 0270977c-df3a-4fdf-84ce-46dec3c0f771 | failed | test.jpg | Processing failed after 1 attempt(s): ENOENT: no such file or directory, open 'C:\Users\USER\Desktop\The AI Integration Slice\uploads\uploads\test.jpg' |
| c8fc1df3-cfe4-4256-8a5a-89ab4a26832f | failed | test.jpg | Processing failed after 1 attempt(s): ENOENT: no such file or directory, open 'C:\Users\USER\Desktop\The AI Integration Slice\uploads\uploads\test.jpg' |


## 2. Raw Model Output vs Validated Parsed Result
### Raw Output (Evidence)
```text
Grocery
Apples 5.00
Milk 2.50
Total 7.50
```

### Validated Parsed Result
```json
{
  "tags": [
    "groceries",
    "expense"
  ],
  "title": "Grocery List",
  "content": "Apples 5.00, Milk 2.50. Total 7.50"
}
```

## 3. Database Holds Only Storage Key
| FileAsset ID | Storage Key | Original Name | Mime Type | Size (Bytes) |
|---|---|---|---|---|
| 10aa0e86-798f-422f-81cd-4bf153bb0999 | cd19ddd3-dbb8-404a-b9c9-9db5bff85b76-EzekateAhurikaCV.pdf | Eze, kate Ahurika CV.pdf | application/pdf | 2083588 |
| 1b4e36b4-347c-4a5b-9ab2-b6517111a4e4 | f4aea7ba-95f4-43e9-b00e-e4e8fce9bd97-POPfinalsketch1.png | POP final sketch (1).png | image/png | 299417 |
| 1eed2921-8a34-4185-8841-bad2b4ab7138 | uploads/test.jpg | test.jpg | image/jpeg | 100 |
| 27b55303-f577-480e-81ed-b97fe469ed49 | uploads/test.jpg | test.jpg | image/jpeg | 100 |
| 2b3b0b99-261a-4aaa-a724-5880d3ac9cf6 | evidence-fail-storage-key-5678 | blurred_note.png | image/png | 51200 |


## 4. UI Screenshots (Evidence)
The following UI states were successfully captured and verified:
- **Dashboard**: Verified successful authentication as `nkieruka dike`.
- **Upload Page**: Verified the "Process Handwritten Notes" UI accepts files (e.g., `Eze, kate Ahurika CV.pdf`).
- **Error State**: Verified that upload failures gracefully display error boxes in the UI when backend connections (like Prisma) drop.

