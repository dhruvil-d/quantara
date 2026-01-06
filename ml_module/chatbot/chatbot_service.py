
import os
import json
import logging
from typing import List, Dict, Any, Optional

from langchain_community.llms import Ollama
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.prompts import PromptTemplate
from langchain_core.documents import Document
from langchain_core.output_parsers import StrOutputParser

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Fallback for ConversationBufferMemory if not available
try:
    from langchain.memory import ConversationBufferMemory
except ImportError:
    class SimpleMessage:
        def __init__(self, type, content):
            self.type = type
            self.content = content

    class SimpleChatHistory:
        def __init__(self):
            self.messages = []
        def add_user_message(self, message):
            self.messages.append(SimpleMessage("human", message))
        def add_ai_message(self, message):
            self.messages.append(SimpleMessage("ai", message))

    class ConversationBufferMemory:
        def __init__(self, memory_key="chat_history", return_messages=False, output_key="answer"):
            self.memory_key = memory_key
            self.chat_memory = SimpleChatHistory()
        
        def load_memory_variables(self, inputs=None):
            buffer = []
            for msg in self.chat_memory.messages:
                prefix = "Human" if msg.type == "human" else "AI"
                buffer.append(f"{prefix}: {msg.content}")
            return {self.memory_key: "\n\n".join(buffer)}
            
        def save_context(self, inputs, outputs):
            input_val = list(inputs.values())[0] if inputs else ""
            output_val = list(outputs.values())[0] if outputs else ""
            self.chat_memory.add_user_message(str(input_val))
            self.chat_memory.add_ai_message(str(output_val))

class ChatbotService:
    def __init__(self, model_name="llama3"):
        self.model_name = model_name
        self.llm = Ollama(model=model_name)
        self.embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
        self.memories = {}  # session_id -> ConversationBufferMemory
        self.vector_stores = {} # session_id + route_id -> FAISS

    def _get_memory(self, session_id: str) -> ConversationBufferMemory:
        if session_id not in self.memories:
            self.memories[session_id] = ConversationBufferMemory(memory_key="chat_history")
        return self.memories[session_id]

    def _create_vector_store(self, route_context: Dict[str, Any]) -> FAISS:
        """Create a temporary vector store from route context."""
        # Convert route context to text chunks
        text_content = json.dumps(route_context, indent=2)
        documents = [Document(page_content=text_content, metadata={"source": "route_data"})]
        
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        splits = text_splitter.split_documents(documents)
        
        return FAISS.from_documents(splits, self.embeddings)

    def chat(self, message: str, route_context: Dict[str, Any], session_id: str = "default") -> str:
        try:
            memory = self._get_memory(session_id)
            
            # Create a fresh vector store for this request's context (or cache if consistent)
            # For simplicity/correctness with changing routes, we create it per request or handle caching carefully.
            # Here we regenerate it to ensure it matches the current route being discussed.
            vectorstore = self._create_vector_store(route_context)
            retriever = vectorstore.as_retriever()
            
            # Retrieve relevant context
            docs = retriever.invoke(message)
            context_text = "\n\n".join([d.page_content for d in docs])

            # Prompt template
            template = """You are an intelligent logistics assistant. You are helping a user analyze a specific shipping route.
Use the following context about the route to answer the user's question.
If you don't know the answer based on the context, say you don't know.

Context:
{context}

Chat History:
{chat_history}

User: {question}
Assistant:"""
            
            prompt = PromptTemplate(
                input_variables=["context", "chat_history", "question"],
                template=template
            )

            # Chain
            chain = prompt | self.llm | StrOutputParser()
            
            chat_history = memory.load_memory_variables({})["chat_history"]
            
            response = chain.invoke({
                "context": context_text,
                "chat_history": chat_history,
                "question": message
            })

            # Save to memory
            memory.save_context({"input": message}, {"output": response})
            
            return response

        except Exception as e:
            logger.error(f"Error in chat: {e}")
            return f"I encountered an error: {str(e)}"

# Global instance
chatbot_service = ChatbotService()
