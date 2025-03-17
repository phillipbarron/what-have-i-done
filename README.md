# What Have I Done

## Description

Fetches your commits and reviews from Github for a specified org. Outputs as HTML
Can limit to a date range supplied as arguments

## Installation


```bash
# Clone the repository
git clone https://github.com/yourusername/what-have-i-done.git

# Navigate to the project directory
cd what-have-i-done

# Install dependencies
yarn i
```

## Usage
Instructions on how to use your project.

You must export a github token with repo access as `GH_TOKEN` in your environment.   

```bash
# Run the project
yarn start [org] [from (optional)] [to (optional)]
```


# Todo

- Package with deno
- Update args to allow passing relative dates
