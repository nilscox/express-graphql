const http = require('http');
const express = require('express');
const { PubSub } = require('apollo-server');
const { ApolloServer, gql } = require('apollo-server-express');

// Construct a schema, using GraphQL schema language
const typeDefs = gql`

type Query {
  totalPersons: Int!
  allPersons(last: Int): [Person!]!
}

type Mutation {
  createPerson(name: String!, age: Int!): Person!
  happyBirthday(name: String!): Person!
}

type Subscription {
  newPerson: Person!
}

type Person {
  name: String!
  age: Int!
  posts: [Post!]!
}

type Post {
  title: String!
  author: Person!
}

`;

type Person = {
  name: string;
  age: number;
  posts: Post[];
};

type Post = {
  title: string;
  author: Person;
}

type DB = {
  persons: Person[],
  posts: Post[],
};

const db: DB = {
  persons: [],
  posts: [],
};

const pubsub = new PubSub();

const ADD_PERSON = 'ADD_PERSON';

// Provide resolver functions for your schema fields
const resolvers = {
  Query: {
    totalPersons: () => db.persons.length,
    allPersons: (_, { last = 0 }) => db.persons.slice(-last),
  },
  Mutation: {
    createPerson: (_, { name, age }) => {
      const person: Person = {
        name,
        age,
        posts: [],
      };

      db.persons.push(person);
      pubsub.publish(ADD_PERSON, { newPerson: person });

      return person;
    },
    happyBirthday: (_, { name }) => {
      const person = db.persons.find(p => p.name === name);

      if (!person)
        throw new Error('person not found');

      person.age += 1;

      return person;
    },
  },
  Subscription: {
    newPerson: {
      subscribe: () => pubsub.asyncIterator([ADD_PERSON]),
    },
  },
};

const PORT = 4000;
const app = express();
const server = new ApolloServer({ typeDefs, resolvers });

server.applyMiddleware({app})

const httpServer = http.createServer(app);
server.installSubscriptionHandlers(httpServer);

httpServer.listen(PORT, () => {
  console.log(`🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`)
  console.log(`🚀 Subscriptions ready at ws://localhost:${PORT}${server.subscriptionsPath}`)
});
