import axios from 'axios';
import fs from 'fs';

// Define the GitHub API URL
const GITHUB_API_URL = 'https://api.github.com/graphql';

// Get the GitHub Token from the environment
const GH_TOKEN = process.env.GH_TOKEN;

if (!GH_TOKEN) {
    console.error('GitHub token (GH_TOKEN) is missing.');
    process.exit(1);
}

// A function to fetch the logged-in user's data from GitHub's GraphQL API
async function fetchLoggedInUser(token: string): Promise<string> {
    // The GraphQL query to fetch the logged-in user's details
    const query = `
      query {
        viewer {
          login
          name
          url
        }
      }
    `;

    // Request options for the fetch call
    const requestOptions: RequestInit = {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({query})
    };

    try {
        const response = await fetch(GITHUB_API_URL, requestOptions);

        // Check if the response is ok (status 200)
        if (!response.ok) {
            throw new Error(`GitHub API request failed with status: ${response.status}`);
        }

        const resp = await response.json();
        const { data: { viewer: { login : user }}} = resp

        // Return the logged-in user's data (viewer)
        return user;
    } catch (error) {
        console.error('Error fetching GitHub user data:', error);
        throw error;
    }
}


// GraphQL query to get pull requests and reviews
const getPrsAndReviewsQuery = (org: string, fromDate: string | undefined, toDate: string | undefined, ghUser: string) => {
    const dateFilter = (fromDate || toDate)
        ? `createdAt: {${fromDate ? `gte: "${fromDate}"` : ''}${fromDate && toDate ? ', ' : ''}${toDate ? `lte: "${toDate}"` : ''}}`
        : '';

    return `
    {
        search(query: "org:${org} is:pr author:${ghUser} ${dateFilter}", type: ISSUE, first: 100) {
            edges {
                node {
                    ... on PullRequest {
                        id
                        title
                        url
                        createdAt
                        author {
                            login
                        }
                        reviews(first: 10) {
                            edges {
                                node {
                                    id
                                    author {
                                        login
                                    }
                                    state
                                    body
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    `;
};

// Function to fetch the data from GitHub API
const fetchPrsAndReviews = async (org: string, fromDate?: string, toDate?: string) => {
    const ghUser = await fetchLoggedInUser(GH_TOKEN);
    try {
        const query = getPrsAndReviewsQuery(org, fromDate, toDate, ghUser);
        const requestOptions: RequestInit = {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GH_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({query})
        };

        const response = await fetch(GITHUB_API_URL, requestOptions);

        if (!response.ok) {
            throw new Error(`GitHub API request failed with status: ${response.status}`);
        }
        const { data } = await response.json();

        return data.search.edges;
    } catch (error) {
        console.error('Error fetching data from GitHub:', error);
        process.exit(1);
    }
};

// Function to generate an HTML file with the results
const generateHtml = (prData: any) => {
    let htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>GitHub PRs and Reviews</title>
    </head>
    <body>
        <h1>Your Pull Requests and Reviews</h1>
        <ul>
    `;

    prData.forEach((pr: any) => {
        htmlContent += `
            <li>
                <a href="${pr.node.url}" target="_blank">${pr.node.title}</a>
                <ul>
                    ${pr.node.reviews.edges
            .map((review: any) => {
                return `
                                <li><strong>${review.node.author.login}</strong> (${review.node.state}): ${review.node.body}</li>
                            `;
            })
            .join('')}
                </ul>
            </li>
        `;
    });

    htmlContent += `
        </ul>
    </body>
    </html>
    `;

    fs.writeFileSync('prs_and_reviews.html', htmlContent);
    console.log('Generated prs_and_reviews.html');
};

// CLI Tool Implementation
export const run = async () => {
    const args = process.argv.slice(2);

    const org = args[0]; // Organization name (first argument)
    if (!org) {
        console.error('Please provide an organization name.');
        process.exit(1);
    }

    const fromDate = args[1]; // Optional 'from' date (second argument)
    const toDate = args[2]; // Optional 'to' date (third argument)

    // Fetch PRs and reviews
    const prData = await fetchPrsAndReviews(org, fromDate, toDate);

    // Generate and output the HTML file
    generateHtml(prData);
};

